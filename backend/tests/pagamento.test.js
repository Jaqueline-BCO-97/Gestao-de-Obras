const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");

const empresaA = "empresa-pag-a";
const empresaB = "empresa-pag-b";
const usuarios = [
  { id: "cliente-a", email: "cliente-a@teste.local", nome: "Cliente A", tipo: "CLIENTE", empresaId: empresaA },
  { id: "cliente-outro-a", email: "outro@teste.local", nome: "Outro cliente", tipo: "CLIENTE", empresaId: empresaA },
  { id: "cliente-b", email: "cliente-b@teste.local", nome: "Cliente B", tipo: "CLIENTE", empresaId: empresaB },
  { id: "admin-a", email: "admin@teste.local", nome: "Admin", tipo: "ADMIN", empresaId: empresaA },
  { id: "colab-ativo", email: "colab@teste.local", nome: "Colaborador", tipo: "COLABORADOR", empresaId: empresaA },
  { id: "colab-inativo", email: "inativo@teste.local", nome: "Inativo", tipo: "COLABORADOR", empresaId: empresaA },
];
let obras;
let pagamentos;
let eventos;
let proximoPagamento;
let chamadasCriacao;
let respostasExternas;
let erroProvedor;
let filaTransacoes = Promise.resolve();

const funcionarios = [
  { id: "func-ativo", usuarioId: "colab-ativo", empresaId: empresaA, ativo: true },
  { id: "func-inativo", usuarioId: "colab-inativo", empresaId: empresaA, ativo: true },
];

function localizar(lista, where) {
  return lista.find((item) => Object.entries(where).every(([chave, valor]) => item[chave] === valor)) || null;
}

function pagamentosDaConsulta(where = {}) {
  let resultado = pagamentos;
  if (where.obraId) resultado = resultado.filter((item) => item.obraId === where.obraId);
  if (where.parcelaId) resultado = resultado.filter((item) => item.parcelaId === where.parcelaId);
  if (where.status?.in) resultado = resultado.filter((item) => where.status.in.includes(item.status));
  else if (where.status) resultado = resultado.filter((item) => item.status === where.status);
  return resultado;
}

function expandirPagamento(pagamento) {
  if (!pagamento) return null;
  const obra = localizar(obras, { id: pagamento.obraId });
  const parcela = obra?.parcelas.find((item) => item.id === pagamento.parcelaId);
  return {
    ...pagamento,
    obra: obra ? { id: obra.id, nome: obra.nome, empresaId: obra.empresaId } : null,
    parcela: parcela ? { id: parcela.id, numero: parcela.numero, valor: parcela.valor, situacao: parcela.situacao } : null,
    usuario: localizar(usuarios, { id: pagamento.usuarioId }),
  };
}

const prismaFalso = {
  obra: {
    findFirst: async ({ where }) => {
      const obra = localizar(obras, where);
      if (!obra) return null;
      const cliente = localizar(usuarios, { id: obra.clienteId });
      return { ...obra, cliente: cliente ? { id: cliente.id, email: cliente.email } : null };
    },
  },
  pagamento: {
    findUnique: async ({ where }) => {
      const found = where.id
        ? localizar(pagamentos, { id: where.id })
        : localizar(pagamentos, { chaveIdempotencia: where.chaveIdempotencia });
      return expandirPagamento(found);
    },
    findMany: async ({ where }) => pagamentosDaConsulta(where).map((item) => ({ parcelaId: item.parcelaId, valor: item.valor, status: item.status })),
    create: async ({ data }) => {
      if (localizar(pagamentos, { chaveIdempotencia: data.chaveIdempotencia })) {
        const erro = new Error("Unique idempotency key");
        erro.code = "P2002";
        throw erro;
      }
      const item = {
        id: `pagamento-${++proximoPagamento}`,
        pedidoExternoId: null,
        transacaoExternaId: null,
        checkoutUrl: null,
        detalheStatus: null,
        ...data,
      };
      pagamentos.push(item);
      return { ...item };
    },
    update: async ({ where, data }) => {
      const item = localizar(pagamentos, where);
      if (!item) throw Object.assign(new Error("Missing payment"), { code: "P2025" });
      if (data.transacaoExternaId && pagamentos.some((outro) => outro.id !== item.id && outro.transacaoExternaId === data.transacaoExternaId)) {
        throw Object.assign(new Error("Unique external transaction"), { code: "P2002" });
      }
      Object.assign(item, data);
      return { ...item };
    },
  },
  parcela: {
    update: async ({ where, data }) => {
      const parcela = obras.flatMap((obra) => obra.parcelas).find((item) => item.id === where.id);
      if (!parcela) throw Object.assign(new Error("Missing installment"), { code: "P2025" });
      Object.assign(parcela, data);
      return { ...parcela };
    },
  },
  obraEvento: {
    create: async ({ data }) => {
      const evento = { id: `evento-${eventos.length + 1}`, ...data };
      eventos.push(evento);
      return evento;
    },
  },
};
prismaFalso.$transaction = async (callback) => {
  const anterior = filaTransacoes;
  let liberar;
  filaTransacoes = new Promise((resolve) => { liberar = resolve; });
  await anterior;
  try {
    return await callback(prismaFalso);
  } finally {
    liberar();
  }
};

const dbPath = require.resolve("../src/config/db");
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getPrisma: () => prismaFalso, isDbConfigured: () => true },
};

const usuarioRepositoryPath = require.resolve("../src/repositories/usuarioRepository");
require.cache[usuarioRepositoryPath] = {
  id: usuarioRepositoryPath,
  filename: usuarioRepositoryPath,
  loaded: true,
  exports: {
    buscarPerfilUsuarioPorId: async (id) => localizar(usuarios, { id }),
    buscarFuncionarioPorUsuarioId: async (usuarioId) => localizar(funcionarios, { usuarioId }),
    listarUsuarios: async () => [],
    buscarUsuarioPorEmail: async () => null,
    buscarUsuarioPorId: async () => null,
    atualizarSenhaUsuario: async () => null,
    criarUsuarioColaborador: async () => null,
  },
};

process.env.JWT_SECRET = "segredo-testes-pagamento";
process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST = "TEST-ONLY-token";
process.env.MERCADO_PAGO_WEBHOOK_SECRET = "segredo-webhook-teste";
const moduloMercadoPago = require.resolve("../src/services/mercadoPagoService");
const mercadoPagoReal = require(moduloMercadoPago);
require.cache[moduloMercadoPago] = {
  id: moduloMercadoPago,
  filename: moduloMercadoPago,
  loaded: true,
  exports: {
    ...mercadoPagoReal,
    criarPedidoSandbox: async ({ pagamento }) => {
      chamadasCriacao.push(pagamento.id);
      if (erroProvedor) throw erroProvedor;
      return { id: `ORD_${pagamento.id}`, checkoutUrl: `https://www.mercadopago.com.br/checkout/${pagamento.id}` };
    },
    consultarPedidoExterno: async (id) => respostasExternas.get(String(id)),
  },
};

const app = require("../index");

function token(usuarioId) {
  const usuario = localizar(usuarios, { id: usuarioId });
  return jwt.sign({ id: usuario.id, email: usuario.email, tipo: usuario.tipo, empresaId: usuario.empresaId }, process.env.JWT_SECRET);
}

async function chamarRota(metodo, caminho, { usuarioId, body = {}, headers = {}, query = {}, params = {} } = {}) {
  const camada = app.router.stack.find((item) => item.route?.path === caminho && item.route.methods[metodo.toLowerCase()]);
  assert.ok(camada, `Rota ${metodo} ${caminho} precisa existir`);
  const req = {
    headers: {
      ...(usuarioId ? { authorization: `Bearer ${token(usuarioId)}` } : {}),
      ...headers,
    },
    body,
    params,
    query,
  };
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
  const handlers = camada.route.stack.map((item) => item.handle);
  async function executar(indice) {
    if (indice >= handlers.length) return;
    let seguinte;
    await handlers[indice](req, res, () => { seguinte = executar(indice + 1); return seguinte; });
    if (seguinte) await seguinte;
  }
  await executar(0);
  return res;
}

function criarPagamento(usuarioId = "cliente-a", { valor = 100, chave = `chave-${Date.now()}-${Math.random()}`, parcelaId = "parcela-1", obraId = "obra-a" } = {}) {
  return chamarRota("POST", "/obras/:id/pagamento", {
    usuarioId,
    params: { id: obraId },
    body: { parcelaId, valor },
    headers: { "idempotency-key": chave },
  });
}

function assinaturaPara(dataId, requestId = `req-${dataId}`) {
  const ts = "1784210400";
  const manifesto = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac("sha256", process.env.MERCADO_PAGO_WEBHOOK_SECRET).update(manifesto).digest("hex");
  return { requestId, assinatura: `ts=${ts},v1=${v1}` };
}

async function notificarPagamento(pagamento, dadoExterno) {
  const pedidoId = pagamento.pedidoExternoId;
  const status = dadoExterno.status === "approved" ? "processed" : dadoExterno.status;
  const order = {
    id: pedidoId,
    external_reference: dadoExterno.external_reference,
    currency: dadoExterno.currency_id,
    total_amount: String(dadoExterno.transaction_amount),
    total_paid_amount: status === "processed" ? String(dadoExterno.transaction_amount) : "0.00",
    status,
    status_detail: dadoExterno.status_detail || status,
    transactions: {
      payments: dadoExterno.id ? [{
        id: dadoExterno.id,
        amount: String(dadoExterno.transaction_amount),
        paid_amount: status === "processed" ? String(dadoExterno.transaction_amount) : "0.00",
        status: status === "processed" ? "processed" : status,
        status_detail: dadoExterno.status_detail,
      }] : [],
    },
  };
  respostasExternas.set(String(pedidoId), order);
  const { requestId, assinatura } = assinaturaPara(pedidoId);
  return chamarRota("POST", "/webhooks/mercado-pago", {
    query: { type: "order", "data.id": String(pedidoId) },
    headers: { "x-request-id": requestId, "x-signature": assinatura },
    body: { type: "order", data: { id: pedidoId } },
  });
}

describe("Issue #18 — pagamento por checkout sandbox", () => {
  beforeEach(() => {
    obras = [
      {
        id: "obra-a", nome: "Reforma A", empresaId: empresaA, clienteId: "cliente-a", valorTotal: "1500.00",
        parcelas: [
          { id: "parcela-1", numero: 1, valor: "1000.00", situacao: "PENDENTE", pagaEm: null, pagamentoExternoId: null },
          { id: "parcela-2", numero: 2, valor: "500.00", situacao: "PENDENTE", pagaEm: null, pagamentoExternoId: null },
        ],
      },
      { id: "obra-b", nome: "Reforma B", empresaId: empresaB, clienteId: "cliente-b", valorTotal: "500.00", parcelas: [{ id: "parcela-b", numero: 1, valor: "500.00", situacao: "PENDENTE", pagaEm: null, pagamentoExternoId: null }] },
    ];
    pagamentos = [];
    eventos = [];
    proximoPagamento = 0;
    chamadasCriacao = [];
    respostasExternas = new Map();
    erroProvedor = null;
    filaTransacoes = Promise.resolve();
    funcionarios.find((item) => item.usuarioId === "colab-ativo").ativo = true;
    funcionarios.find((item) => item.usuarioId === "colab-inativo").ativo = false;
  });

  it("cliente proprietário cria checkout e não quita parcela no retorno do provedor", async () => {
    const resposta = await criarPagamento("cliente-a", { valor: "250.00", chave: "pedido-checkout-01" });
    assert.equal(resposta.statusCode, 201);
    assert.equal(resposta.body.pagamento.status, "PENDENTE");
    assert.equal(resposta.body.pagamento.parcelaId, "parcela-1");
    assert.match(resposta.body.checkoutUrl, /^https:\/\/www\.mercadopago\.com\.br\//);
    assert.equal(obras[0].parcelas[0].situacao, "PENDENTE");
    assert.equal(eventos.length, 0);
  });

  it("limita acesso à obra do cliente e da empresa autenticados", async () => {
    const outroCliente = await criarPagamento("cliente-outro-a", { chave: "outro-cliente-01" });
    const outraEmpresa = await criarPagamento("cliente-b", { chave: "outra-empresa-01" });
    assert.equal(outroCliente.statusCode, 404);
    assert.equal(outraEmpresa.statusCode, 404);
    assert.equal(pagamentos.length, 0);
  });

  it("só aceita parcela que pertence à obra solicitada", async () => {
    const resposta = await criarPagamento("cliente-a", {
      valor: 100,
      chave: "parcela-outra-obra-01",
      parcelaId: "parcela-b",
      obraId: "obra-a",
    });
    assert.equal(resposta.statusCode, 404);
    assert.equal(resposta.body.erro, "Parcela não encontrada nesta obra");
    assert.equal(pagamentos.length, 0);
  });

  it("rejeita valores ausentes, zero, negativos e fora do saldo", async () => {
    const ausente = await chamarRota("POST", "/obras/:id/pagamento", {
      usuarioId: "cliente-a",
      params: { id: "obra-a" },
      body: { parcelaId: "parcela-1" },
      headers: { "idempotency-key": "sem-valor-001" },
    });
    assert.equal(ausente.statusCode, 400);
    for (const valor of [0, -1, "1.001", "not-a-number"]) {
      const resposta = await criarPagamento("cliente-a", { valor, chave: `valor-invalido-${String(valor)}` });
      assert.equal(resposta.statusCode, 400, `valor ${valor}: ${resposta.statusCode}`);
    }
    const acimaDaParcela = await criarPagamento("cliente-a", { valor: 1000.01, chave: "acima-parcela-01" });
    assert.equal(acimaDaParcela.statusCode, 409);
    assert.equal(pagamentos.length, 0);
  });

  it("repetir a mesma chave devolve o mesmo checkout sem criar outra tentativa", async () => {
    const primeira = await criarPagamento("cliente-a", { valor: 125, chave: "idempotencia-001" });
    const repetida = await criarPagamento("cliente-a", { valor: 125, chave: "idempotencia-001" });
    assert.equal(primeira.statusCode, 201);
    assert.equal(repetida.statusCode, 200);
    assert.equal(repetida.body.pagamento.id, primeira.body.pagamento.id);
    assert.equal(repetida.body.checkoutUrl, primeira.body.checkoutUrl);
    assert.equal(pagamentos.length, 1);
    assert.equal(chamadasCriacao.length, 1);
  });

  it("recusa reutilizar a chave idempotente com valor ou obra diferente", async () => {
    await criarPagamento("cliente-a", { valor: 125, chave: "idempotencia-002" });
    const reutilizada = await criarPagamento("cliente-a", { valor: 126, chave: "idempotencia-002" });
    assert.equal(reutilizada.statusCode, 409);
    assert.equal(pagamentos.length, 1);
  });

  it("requisições simultâneas reservam saldo sem ultrapassá-lo", async () => {
    const resultados = await Promise.all([
      criarPagamento("cliente-a", { valor: 700, chave: "concorrente-001" }),
      criarPagamento("cliente-a", { valor: 700, chave: "concorrente-002" }),
    ]);
    assert.deepEqual(resultados.map((item) => item.statusCode).sort(), [201, 409]);
    const reservado = pagamentos.filter((item) => item.status === "PENDENTE").reduce((soma, item) => soma + Number(item.valor), 0);
    assert.ok(reservado <= 1000);
  });

  it("estados pendente e recusado não marcam parcela como paga", async () => {
    const pendente = await criarPagamento("cliente-a", { valor: 200, chave: "status-pendente-01" });
    const registroPendente = pagamentos[0];
    const respostaPendente = await notificarPagamento(registroPendente, {
      id: "9876501", external_reference: registroPendente.id, currency_id: "BRL", transaction_amount: 200,
      status: "pending", status_detail: "pending_waiting_payment",
    });
    assert.equal(respostaPendente.statusCode, 200);
    assert.equal(pagamentos[0].status, "PENDENTE");
    assert.equal(obras[0].parcelas[0].situacao, "PENDENTE");

    await criarPagamento("cliente-a", { valor: 100, chave: "status-recusado-01" });
    const registroRecusado = pagamentos[1];
    const respostaRecusada = await notificarPagamento(registroRecusado, {
      id: "9876502", external_reference: registroRecusado.id, currency_id: "BRL", transaction_amount: 100,
      status: "rejected", status_detail: "cc_rejected_other_reason",
    });
    assert.equal(respostaRecusada.statusCode, 200);
    assert.equal(pagamentos[1].status, "RECUSADO");
    assert.equal(obras[0].parcelas[0].situacao, "PENDENTE");
    assert.equal(pendente.body.pagamento.status, "PENDENTE");
  });

  it("só quita após confirmação aprovada e permite completar parcela com pagamentos parciais", async () => {
    await criarPagamento("cliente-a", { valor: 400, chave: "parcial-aprovado-01" });
    const primeiro = pagamentos[0];
    const webhookParcial = await notificarPagamento(primeiro, {
      id: "9876510", external_reference: primeiro.id, currency_id: "BRL", transaction_amount: 400,
      status: "approved", status_detail: "accredited",
    });
    assert.equal(webhookParcial.statusCode, 200, JSON.stringify(webhookParcial.body));
    assert.equal(primeiro.status, "APROVADO");
    assert.equal(primeiro.transacaoExternaId, "9876510");
    assert.equal(obras[0].parcelas[0].situacao, "PENDENTE");

    await criarPagamento("cliente-a", { valor: 600, chave: "parcial-aprovado-02" });
    const segundo = pagamentos[1];
    await notificarPagamento(segundo, {
      id: "9876511", external_reference: segundo.id, currency_id: "BRL", transaction_amount: 600,
      status: "approved", status_detail: "accredited",
    });
    assert.equal(obras[0].parcelas[0].situacao, "PAGA");
    assert.equal(obras[0].parcelas[0].pagamentoExternoId, "9876511");
    assert.equal(eventos.length, 2);
  });

  it("não processa duas vezes o mesmo ID externo e não regride aprovação", async () => {
    await criarPagamento("cliente-a", { valor: 100, chave: "externo-duplicado-01" });
    const primeiro = pagamentos[0];
    const dado = { id: "9876520", external_reference: primeiro.id, currency_id: "BRL", transaction_amount: 100, status: "approved" };
    await notificarPagamento(primeiro, dado);
    await notificarPagamento(primeiro, { ...dado, status: "pending" });
    assert.equal(primeiro.status, "APROVADO");
    assert.equal(eventos.length, 1);

    await criarPagamento("cliente-a", { valor: 100, chave: "externo-duplicado-02" });
    const segundo = pagamentos[1];
    const duplicado = await notificarPagamento(segundo, { ...dado, external_reference: segundo.id });
    assert.equal(duplicado.statusCode, 409);
    assert.equal(segundo.status, "PENDENTE");
  });

  it("trata recusa do provedor sem criar parcela paga", async () => {
    erroProvedor = Object.assign(new Error("sandbox rejeitou a order"), { code: "MERCADO_PAGO_REJEITOU", statusProvedor: 400 });
    const resposta = await criarPagamento("cliente-a", { valor: 100, chave: "provedor-recusou-01" });
    assert.equal(resposta.statusCode, 502);
    assert.equal(pagamentos[0].status, "ERRO");
    assert.equal(obras[0].parcelas[0].situacao, "PENDENTE");
  });

  it("mantém a reserva após falha de rede ambígua e repete a mesma order com a mesma chave externa", async () => {
    erroProvedor = Object.assign(new Error("timeout"), { code: "MERCADO_PAGO_INDISPONIVEL" });
    const primeira = await criarPagamento("cliente-a", { valor: 100, chave: "timeout-retry-001" });
    const tentativa = pagamentos[0];
    assert.equal(primeira.statusCode, 502);
    assert.equal(tentativa.status, "PENDENTE");

    erroProvedor = null;
    const repetida = await criarPagamento("cliente-a", { valor: 100, chave: "timeout-retry-001" });
    assert.equal(repetida.statusCode, 200);
    assert.equal(chamadasCriacao.length, 2);
    assert.equal(chamadasCriacao[0], chamadasCriacao[1]);
    assert.equal(pagamentos.length, 1);
  });

  it("não aceita aprovação externa com valor divergente", async () => {
    await criarPagamento("cliente-a", { valor: 100, chave: "valor-webhook-001" });
    const tentativa = pagamentos[0];
    const resposta = await notificarPagamento(tentativa, {
      id: "9876525", external_reference: tentativa.id, currency_id: "BRL", transaction_amount: 99,
      status: "approved", status_detail: "accredited",
    });
    assert.equal(resposta.statusCode, 409);
    assert.equal(tentativa.status, "PENDENTE");
    assert.equal(obras[0].parcelas[0].situacao, "PENDENTE");
  });

  it("sem Access Token de sandbox não cria reserva nem chama o provedor", async () => {
    const tokenOriginal = process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST;
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST;
    try {
      const resposta = await criarPagamento("cliente-a", { valor: 100, chave: "sem-token-sandbox-01" });
      assert.equal(resposta.statusCode, 503);
      assert.equal(pagamentos.length, 0);
      assert.equal(chamadasCriacao.length, 0);
    } finally {
      process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST = tokenOriginal;
    }
  });

  it("ADMIN e COLABORADOR não pagam; funcionário desativado é bloqueado pelo authMiddleware", async () => {
    const admin = await criarPagamento("admin-a", { chave: "papel-admin-001" });
    const colaboradorAtivo = await criarPagamento("colab-ativo", { chave: "papel-colab-001" });
    const colaboradorInativo = await criarPagamento("colab-inativo", { chave: "papel-inativo-001" });
    assert.equal(admin.statusCode, 403);
    assert.equal(colaboradorAtivo.statusCode, 403);
    assert.equal(colaboradorInativo.statusCode, 403);
    assert.equal(pagamentos.length, 0);
  });

  it("rejeita webhook sem assinatura correta sem consultar ou alterar pagamento", async () => {
    const resposta = await chamarRota("POST", "/webhooks/mercado-pago", {
      query: { type: "order", "data.id": "ord-invalid" },
      headers: { "x-request-id": "req-invalid", "x-signature": "ts=1,v1=invalid" },
      body: { type: "order", data: { id: "ord-invalid" } },
    });
    assert.equal(resposta.statusCode, 401);
    assert.equal(pagamentos.length, 0);
  });

  it("usa Orders API sandbox e cabeçalho idempotente sem expor o token na resposta", async () => {
    const fetchOriginal = global.fetch;
    let requisicao;
    global.fetch = async (url, opcoes) => {
      requisicao = { url, ...opcoes };
      return { ok: true, status: 201, json: async () => ({ id: "order-realista", checkout_url: "https://www.mercadopago.com.br/checkout/order-realista" }) };
    };
    try {
      const resposta = await mercadoPagoReal.criarPedidoSandbox({
        pagamento: { id: "pagamento-local-uuid", valor: "10.50" },
        obra: { id: "obra-a", nome: "Reforma A" },
        parcela: { numero: 1 },
        email: "cliente-a@teste.local",
      });
      const corpo = JSON.parse(requisicao.body);
      assert.equal(requisicao.url, "https://api.mercadopago.com/v1/orders");
      assert.equal(requisicao.headers.Authorization, "Bearer TEST-ONLY-token");
      assert.equal(requisicao.headers["X-Idempotency-Key"], "pagamento-local-uuid");
      assert.equal(corpo.external_reference, "pagamento-local-uuid");
      assert.equal(corpo.total_amount, "10.50");
      assert.equal(resposta.id, "order-realista");
    } finally {
      global.fetch = fetchOriginal;
    }
  });
});

process.on("exit", () => {
  delete require.cache[dbPath];
  delete require.cache[usuarioRepositoryPath];
});
