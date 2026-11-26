// Usa os testes nativos disponíveis no Node do projeto.
const { describe, it, beforeEach } = require("node:test");
// Usa comparações estritas para verificar estado e respostas.
const assert = require("node:assert/strict");
// Gera tokens válidos para passar pelo middleware de autenticação real.
const jwt = require("jsonwebtoken");
// Usa o mesmo cache compartilhado das listas de obras.
const { invalidarCacheEmpresa } = require("../src/services/cacheConsultas");
// Testa diretamente a função de domínio reutilizável pelo F7.
const { obraSemMovimentoDePagamento } = require("../src/utils/obraSemMovimentoPagamento");

// Define duas empresas para provar o isolamento da obra.
const empresaA = "empresa-vencimento-a";
const empresaB = "empresa-vencimento-b";
// Prepara perfis com papéis diferentes para testar autorização.
const perfis = [
  { id: "admin-a", email: "admin-a@teste.local", tipo: "ADMIN", empresaId: empresaA },
  { id: "admin-b", email: "admin-b@teste.local", tipo: "ADMIN", empresaId: empresaB },
  { id: "cliente-a", email: "cliente-a@teste.local", tipo: "CLIENTE", empresaId: empresaA },
  { id: "gerente-a", email: "gerente-a@teste.local", tipo: "COLABORADOR", empresaId: empresaA },
];
// Guarda o banco falso e os controles de falha e cache.
let estado;
let falharParcelaNumero;
let consultasLista;
let opcoesTransacao;

// Converte uma data ISO em meio-dia UTC como fazem as rotas existentes.
function data(iso) { return new Date(iso + "T12:00:00.000Z"); }

// Gera vencimentos mensais preservando o dia original em meses curtos.
function gerarDataMensal(inicio, indice) {
  const origem = data(inicio);
  const mes = origem.getUTCMonth() + indice;
  const primeiroDia = new Date(Date.UTC(origem.getUTCFullYear(), mes, 1, 12));
  const ultimoDia = new Date(Date.UTC(primeiroDia.getUTCFullYear(), primeiroDia.getUTCMonth() + 1, 0)).getUTCDate();
  primeiroDia.setUTCDate(Math.min(origem.getUTCDate(), ultimoDia));
  return primeiroDia;
}

// Cria o estado inicial da obra agendada e suas parcelas.
function criarEstado({ status = "AGENDADA", clienteId = "cliente-a", inicio = "2020-01-31", quantidade = 3, pagamentos = [] } = {}) {
  estado = {
    obras: [{
      id: "obra-a", empresaId: empresaA, clienteId, status, excluidaEm: null, nome: "Obra A",
      descricao: "Descrição", endereco: "Rua A", estado: "SP", cidade: "São Paulo", bairro: "Centro",
      numero: "10", apartamento: null, bloco: null, semApartamento: true, semBloco: true,
      informacoesAdicionais: "Serviços", fotos: [], prazoFinal: data("2030-12-31"), agendadaPara: null,
      conclusaoConfirmadaEm: null, valorTotal: "300.00", valorBase: "300.00",
      quantidadeParcelas: quantidade, taxaJurosMensal: "0.00",
    }],
    parcelas: Array.from({ length: quantidade }, (_, indice) => ({
      id: "parcela-" + (indice + 1), numero: indice + 1, obraId: "obra-a",
      valor: (100 + indice) + ".00", situacao: "PENDENTE", vencimento: gerarDataMensal(inicio, indice),
      comprovanteUrl: null, comprovanteEnviadoEm: null, pagaEm: null, pagamentoExternoId: null,
      pagamentos: indice === 0 ? structuredClone(pagamentos) : [],
    })),
    eventos: [],
    notificacoes: [],
  };
}

// Localiza obra respeitando todos os campos simples do filtro.
function obterObra(where) {
  return estado.obras.find((obra) => Object.entries(where).every(([campo, valor]) => obra[campo] === valor)) || null;
}

// Monta os dados SQL que a listagem transforma para o frontend.
function linhaObra(obra) {
  const parcelas = estado.parcelas.filter((parcela) => parcela.obraId === obra.id).sort((a, b) => a.numero - b.numero);
  const proxima = parcelas.find((parcela) => parcela.situacao !== "PAGA") || null;
  return {
    ...obra,
    cliente: obra.clienteId ? { id: obra.clienteId, nome: "Cliente A", empresaId: obra.empresaId } : null,
    parcelas: parcelas.map((parcela) => ({
      ...parcela,
      temMovimentoPagamento: parcela.situacao === "PAGA" || Boolean(parcela.comprovanteUrl || parcela.comprovanteEnviadoEm || parcela.pagamentoExternoId || parcela.pagamentos.length),
    })),
    resumoParcelasSql: {
      total: parcelas.length,
      pagas: parcelas.filter((parcela) => parcela.situacao === "PAGA").length,
      valorParcelaPadrao: parcelas[0]?.valor || null,
      ultimasPagas: [],
      proximaNaoPaga: proxima ? { numero: proxima.numero, valor: proxima.valor, situacao: proxima.situacao, vencimento: proxima.vencimento } : null,
    },
    eventos: [], escalas: [], disponibilidades: [], convites: [], contrato: null,
  };
}

// Cria as operações Prisma usadas pelo repositório dentro da transação.
function criarPrismaFalso() {
  const tx = {
    obra: {
      findFirst: async ({ where, select }) => {
        const obra = obterObra(where);
        if (!obra) return null;
        return select ? Object.fromEntries(Object.keys(select).map((campo) => [campo, obra[campo]])) : obra;
      },
      update: async ({ where, data: dados }) => {
        const obra = obterObra({ id: where.id });
        Object.assign(obra, dados);
        return obra;
      },
    },
    parcela: {
      findMany: async ({ where }) => estado.parcelas.filter((parcela) => parcela.obraId === where.obraId).sort((a, b) => a.numero - b.numero),
      update: async ({ where, data: dados }) => {
        const parcela = estado.parcelas.find((item) => item.id === where.id);
        if (falharParcelaNumero === parcela.numero) throw new Error("Falha simulada ao gravar parcela");
        Object.assign(parcela, dados);
        return parcela;
      },
      create: async ({ data: dados }) => {
        const parcela = { id: "parcela-" + (estado.parcelas.length + 1), situacao: "PENDENTE", pagamentos: [], ...dados };
        estado.parcelas.push(parcela);
        return parcela;
      },
      deleteMany: async ({ where }) => {
        const totalAntes = estado.parcelas.length;
        estado.parcelas = estado.parcelas.filter((parcela) => parcela.obraId !== where.obraId || parcela.numero <= where.numero.gt);
        return { count: totalAntes - estado.parcelas.length };
      },
    },
    obraEvento: {
      create: async ({ data: dados }) => {
        const evento = { id: "evento-" + (estado.eventos.length + 1), ...dados };
        estado.eventos.push(evento);
        return evento;
      },
    },
    usuario: {
      findMany: async ({ where }) => perfis
        .filter((perfil) => perfil.empresaId === where.empresaId && perfil.tipo === where.tipo && perfil.id !== where.id?.not)
        .map(({ id }) => ({ id })),
    },
    obraEscala: { findMany: async () => [] },
    notificacao: {
      createMany: async ({ data: dados }) => {
        estado.notificacoes.push(...dados);
        return { count: dados.length };
      },
    },
  };
  return {
    $queryRaw: async () => {
      consultasLista += 1;
      return estado.obras.filter((obra) => obra.empresaId === empresaA && !obra.excluidaEm).map(linhaObra);
    },
    $transaction: async (operacao, opcoes) => {
      opcoesTransacao.push(opcoes || null);
      const copia = structuredClone(estado);
      try { return await operacao(tx); }
      catch (erro) { estado = copia; throw erro; }
    },
  };
}

// Redireciona o repositório de banco para o estado isolado em memória.
const dbPath = require.resolve("../src/config/db");
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getPrisma: criarPrismaFalso, isDbConfigured: () => true },
};
// Define uma chave de teste que não corresponde a nenhum segredo real.
process.env.JWT_SECRET = "segredo-de-teste-vencimento";
// Substitui consultas de usuário por perfis locais para autenticação.
const usuarioRepositoryPath = require.resolve("../src/repositories/usuarioRepository");
require.cache[usuarioRepositoryPath] = {
  id: usuarioRepositoryPath,
  filename: usuarioRepositoryPath,
  loaded: true,
  exports: {
    buscarAutenticacaoUsuarioPorId: async (id) => perfis.find((perfil) => perfil.id === id) || null,
    buscarPerfilUsuarioPorId: async (id) => perfis.find((perfil) => perfil.id === id) || null,
    buscarFuncionarioPorUsuarioId: async () => null,
    listarUsuarios: async () => [],
    buscarUsuarioPorEmail: async () => null,
    buscarUsuarioPorId: async () => null,
    atualizarSenhaUsuario: async () => null,
    criarUsuarioColaborador: async () => null,
  },
};
// Carrega a aplicação e o repositório reais sobre os adaptadores falsos.
const app = require("../index");

// Assina um JWT para o perfil escolhido no caso de teste.
function tokenDo(usuarioId) {
  const usuario = perfis.find((perfil) => perfil.id === usuarioId);
  return jwt.sign({ id: usuario.id, email: usuario.email, tipo: usuario.tipo, empresaId: usuario.empresaId }, process.env.JWT_SECRET);
}

// Chama uma rota real diretamente e imita a invalidação no evento finish.
async function requisitar(caminho, usuarioId, { method = "GET", body = {} } = {}) {
  const metodo = method.toLowerCase();
  const segmentos = caminho.split("/").filter(Boolean);
  const camada = app.router.stack.find((item) => item.route?.methods[metodo]
    && item.route.path.split("/").filter(Boolean).length === segmentos.length
    && item.route.path.split("/").filter(Boolean).every((parte, indice) => parte.startsWith(":") || parte === segmentos[indice]));
  assert.ok(camada, "A rota " + method + " " + caminho + " deve existir");
  const nomes = camada.route.path.split("/").filter(Boolean);
  const params = Object.fromEntries(nomes.flatMap((nome, indice) => nome.startsWith(":") ? [[nome.slice(1), segmentos[indice]]] : []));
  const req = { headers: usuarioId ? { authorization: "Bearer " + tokenDo(usuarioId) } : {}, params, body };
  const res = {
    statusCode: 200,
    body: undefined,
    status(codigo) { this.statusCode = codigo; return this; },
    json(dados) { this.body = dados; return this; },
  };
  const handlers = camada.route.stack.map((item) => item.handle);
  async function executar(indice) {
    if (indice >= handlers.length) return;
    let seguinte;
    await handlers[indice](req, res, () => { seguinte = executar(indice + 1); return seguinte; });
    if (seguinte) await seguinte;
  }
  await executar(0);
  if (["post", "put", "patch", "delete"].includes(metodo) && res.statusCode < 400) invalidarCacheEmpresa(req.usuario?.empresaId);
  return { status: res.statusCode, json: async () => res.body };
}

// Reinicia dados, falhas e cache antes de cada caso independente.
beforeEach(() => {
  criarEstado();
  falharParcelaNumero = null;
  consultasLista = 0;
  opcoesTransacao = [];
  invalidarCacheEmpresa(empresaA);
});

// Agrupa os testes de vencimento, notificações e atualização de cache.
describe("Alteração do vencimento da obra", () => {
  // Confirma datas, valores, total, evento próprio, notificação e transação serializável.
  it("atualiza datas e notifica o cliente somente com as datas anteriores e novas", async () => {
    const valoresAntes = estado.parcelas.map((parcela) => parcela.valor);
    const totalAntes = estado.obras[0].valorTotal;
    const quantidadeAntes = estado.obras[0].quantidadeParcelas;
    const resposta = await requisitar("/obras/obra-a/vencimento", "admin-a", { method: "PATCH", body: { vencimentoInicial: "2030-01-31" } });
    assert.equal(resposta.status, 200);
    assert.deepEqual(estado.parcelas.map((parcela) => parcela.vencimento.toISOString().slice(0, 10)), ["2030-01-31", "2030-02-28", "2030-03-31"]);
    assert.deepEqual(estado.parcelas.map((parcela) => parcela.valor), valoresAntes);
    assert.equal(estado.obras[0].valorTotal, totalAntes);
    assert.equal(estado.obras[0].quantidadeParcelas, quantidadeAntes);
    assert.equal(estado.eventos[0].tipo, "ANOTACAO");
    assert.equal(estado.eventos[0].visivelParaCliente, true);
    assert.match(estado.eventos[0].descricao, /Vencimento das parcelas alterado de 31\/01\/2020 para 31\/01\/2030/);
    assert.doesNotMatch(estado.eventos[0].descricao, /Dados básicos da obra atualizados/);
    assert.equal(estado.notificacoes.length, 1);
    assert.equal(estado.notificacoes[0].usuarioId, "cliente-a");
    assert.equal(estado.notificacoes[0].descricao, "31/01/2020 → 31/01/2030");
    assert.equal(opcoesTransacao.at(-1).isolationLevel, "Serializable");
  });

  // Confirma que ausência de cliente impede notificações e datas passadas continuam válidas.
  it("não notifica obra sem cliente e mantém a validação atual para data passada", async () => {
    estado.obras[0].clienteId = null;
    const resposta = await requisitar("/obras/obra-a/vencimento", "admin-a", { method: "PATCH", body: { vencimentoInicial: "2020-01-31" } });
    assert.equal(resposta.status, 200);
    assert.equal(estado.notificacoes.length, 0);
  });

  // Confirma que status iniciado retorna a explicação clara e não muda datas.
  it("recusa obra iniciada com erro claro", async () => {
    estado.obras[0].status = "EM_ANDAMENTO";
    const resposta = await requisitar("/obras/obra-a/vencimento", "admin-a", { method: "PATCH", body: { vencimentoInicial: "2030-01-31" } });
    assert.equal(resposta.status, 409);
    assert.equal((await resposta.json()).erro, "Só é possível alterar o vencimento enquanto a obra não começou e nenhuma parcela tiver pagamento.");
    assert.equal(estado.parcelas[0].vencimento.toISOString().slice(0, 10), "2020-01-31");
  });

  // Confirma que parcela paga impede o vencimento.
  it("recusa parcela paga", async () => {
    estado.parcelas[0].situacao = "PAGA";
    const resposta = await requisitar("/obras/obra-a/vencimento", "admin-a", { method: "PATCH", body: { vencimentoInicial: "2030-01-31" } });
    assert.equal(resposta.status, 409);
    assert.match((await resposta.json()).erro, /nenhuma parcela tiver pagamento/);
  });

  // Confirma que comprovante pendente de análise conta como movimento.
  it("recusa comprovante em análise", async () => {
    estado.parcelas[0].comprovanteUrl = "https://arquivo-teste.local/comprovante";
    estado.parcelas[0].comprovanteEnviadoEm = data("2020-01-20");
    const resposta = await requisitar("/obras/obra-a/vencimento", "admin-a", { method: "PATCH", body: { vencimentoInicial: "2030-01-31" } });
    assert.equal(resposta.status, 409);
    assert.equal(estado.parcelas[0].vencimento.toISOString().slice(0, 10), "2020-01-31");
  });

  // Confirma que uma tentativa iniciada no Mercado Pago bloqueia a alteração.
  it("recusa pagamento iniciado no Mercado Pago", async () => {
    estado.parcelas[0].pagamentos = [{ id: "pagamento-mp", status: "PENDENTE" }];
    const resposta = await requisitar("/obras/obra-a/vencimento", "admin-a", { method: "PATCH", body: { vencimentoInicial: "2030-01-31" } });
    assert.equal(resposta.status, 409);
    assert.equal(estado.parcelas[0].vencimento.toISOString().slice(0, 10), "2020-01-31");
  });

  // Confirma que todos os estados de tentativa são considerados movimento.
  it("considera movimento qualquer estado de Pagamento", () => {
    for (const status of ["PENDENTE", "APROVADO", "RECUSADO", "CANCELADO", "ERRO"]) {
      assert.equal(obraSemMovimentoDePagamento({ parcelas: [{ situacao: "PENDENTE", pagamentos: [{ id: "pagamento", status }] }] }), false, status);
    }
  });

  // Confirma autorização exclusiva de ADMIN da empresa proprietária.
  it("recusa cliente, gerente e ADMIN de outra empresa sem revelar a obra", async () => {
    const cliente = await requisitar("/obras/obra-a/vencimento", "cliente-a", { method: "PATCH", body: { vencimentoInicial: "2030-01-31" } });
    assert.equal(cliente.status, 403);
    const gerente = await requisitar("/obras/obra-a/vencimento", "gerente-a", { method: "PATCH", body: { vencimentoInicial: "2030-01-31" } });
    assert.equal(gerente.status, 403);
    const outraEmpresa = await requisitar("/obras/obra-a/vencimento", "admin-b", { method: "PATCH", body: { vencimentoInicial: "2030-01-31" } });
    assert.equal(outraEmpresa.status, 404);
    assert.equal((await outraEmpresa.json()).erro, "Obra não encontrada");
    assert.doesNotMatch(JSON.stringify(await outraEmpresa.json()), /empresa-vencimento-a|cliente-a/);
  });

  // Confirma que vencimento vazio usa a validação atual do cadastro.
  it("recusa vencimento vazio sem iniciar transação", async () => {
    const resposta = await requisitar("/obras/obra-a/vencimento", "admin-a", { method: "PATCH", body: { vencimentoInicial: "" } });
    assert.equal(resposta.status, 400);
    assert.equal((await resposta.json()).erro, "Informe a data do primeiro vencimento");
    assert.equal(opcoesTransacao.length, 0);
    const formatoInvalido = await requisitar("/obras/obra-a/vencimento", "admin-a", { method: "PATCH", body: { vencimentoInicial: "31/01/2030" } });
    assert.equal(formatoInvalido.status, 400);
  });

  // Confirma rollback de datas, evento e notificação quando uma parcela falha.
  it("reverte as datas quando uma atualização falha no meio", async () => {
    falharParcelaNumero = 2;
    const resposta = await requisitar("/obras/obra-a/vencimento", "admin-a", { method: "PATCH", body: { vencimentoInicial: "2030-01-31" } });
    assert.equal(resposta.status, 500);
    assert.deepEqual(estado.parcelas.map((parcela) => parcela.vencimento.toISOString().slice(0, 10)), ["2020-01-31", "2020-02-29", "2020-03-31"]);
    assert.equal(estado.eventos.length, 0);
    assert.equal(estado.notificacoes.length, 0);
  });

  // Confirma que o PATCH legado compartilha a regra da rota dedicada.
  it("aplica o mesmo bloqueio no PATCH genérico com vencimentoInicial", async () => {
    estado.obras[0].status = "AGUARDANDO_CONFERENCIA";
    const resposta = await requisitar("/obras/obra-a", "admin-a", { method: "PATCH", body: { vencimentoInicial: "2030-01-31" } });
    assert.equal(resposta.status, 409);
    assert.equal((await resposta.json()).erro, "Só é possível alterar o vencimento enquanto a obra não começou e nenhuma parcela tiver pagamento.");
    assert.equal(estado.parcelas[0].vencimento.toISOString().slice(0, 10), "2020-01-31");
  });

  // Confirma que o caminho legado permite a mesma alteração quando a regra aceita.
  it("aplica a regra compartilhada quando o PATCH genérico recebe vencimentoInicial válido", async () => {
    const resposta = await requisitar("/obras/obra-a", "admin-a", { method: "PATCH", body: { vencimentoInicial: "2030-01-31" } });
    assert.equal(resposta.status, 200);
    assert.deepEqual(estado.parcelas.map((parcela) => parcela.vencimento.toISOString().slice(0, 10)), ["2030-01-31", "2030-02-28", "2030-03-31"]);
    assert.equal(estado.eventos.length, 1);
    assert.match(estado.eventos[0].descricao, /Vencimento das parcelas alterado/);
    assert.doesNotMatch(estado.eventos[0].descricao, /Dados básicos da obra atualizados/);
    assert.equal(opcoesTransacao.at(-1).isolationLevel, "Serializable");
  });

  // Confirma que aumentar quantidade começa pela parcela 1 atual depois de mudar datas.
  it("recalcula a quantidade a partir da parcela 1 atual", async () => {
    const vencimento = await requisitar("/obras/obra-a/vencimento", "admin-a", { method: "PATCH", body: { vencimentoInicial: "2029-01-31" } });
    assert.equal(vencimento.status, 200);
    const quantidade = await requisitar("/obras/obra-a", "admin-a", { method: "PATCH", body: { quantidadeParcelas: 4 } });
    assert.equal(quantidade.status, 200);
    assert.deepEqual(estado.parcelas.map((parcela) => parcela.vencimento.toISOString().slice(0, 10)), ["2029-01-31", "2029-02-28", "2029-03-31", "2029-04-30"]);
    assert.equal(estado.obras[0].quantidadeParcelas, 4);
  });

  // Confirma invalidação do cache no painel do cliente e no resumo da listagem.
  it("invalida o cache do painel do cliente para mostrar vencimento e resumo novos", async () => {
    const primeiraLeitura = await requisitar("/obras", "cliente-a");
    assert.equal((await primeiraLeitura.json())[0].resumoParcelas.proximaNaoPaga.estado, "Atrasada");
    assert.equal(consultasLista, 1);
    await requisitar("/obras", "cliente-a");
    assert.equal(consultasLista, 1);
    const alteracao = await requisitar("/obras/obra-a/vencimento", "admin-a", { method: "PATCH", body: { vencimentoInicial: "2030-01-31" } });
    assert.equal(alteracao.status, 200);
    const leituraAtualizada = await requisitar("/obras", "cliente-a");
    const obraAtualizada = (await leituraAtualizada.json())[0];
    assert.equal(consultasLista, 2);
    assert.equal(obraAtualizada.parcelas[0].vencimentoISO, "2030-01-31");
    assert.equal(obraAtualizada.resumoParcelas.proximaNaoPaga.estado, "Pendente");
  });
});
