const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { Prisma } = require("@prisma/client");
const caminhoDb = require.resolve("../src/config/db");
const chamadas = [];
let linhasSql = [];
let linhasArquivadasSql = [];
let linhasPerfilSql = [];
let linhasAutenticacaoSql = [];
const prismaFalso = {
  $queryRaw: async (consulta) => {
    chamadas.push(consulta);
    if (consulta.text.includes('FROM "Usuario" usuario')) {
      const id = consulta.values.find((valor) => [...linhasPerfilSql, ...linhasAutenticacaoSql].some((linha) => linha.id === valor));
      const fonte = consulta.text.includes('LEFT JOIN "Empresa" empresa') ? linhasPerfilSql : linhasAutenticacaoSql;
      return fonte.filter((linha) => linha.id === id).slice(0, 1);
    }
    if (consulta.text.includes('o."excluidaEm" IS NOT NULL')) return linhasArquivadasSql;
    if (consulta.text.includes("WHERE o.id =")) {
      const id = consulta.values.find((valor) => linhasSql.some((linha) => linha.id === valor));
      return linhasSql.filter((linha) => linha.id === id).slice(0, 1);
    }
    return linhasSql;
  },
};

require.cache[caminhoDb] = {
  id: caminhoDb,
  filename: caminhoDb,
  loaded: true,
  exports: { getPrisma: () => prismaFalso, isDbConfigured: () => true },
};
const { listarObras, buscarObraPorId, listarObrasArquivadas } = require("../src/repositories/obraRepository");
const { buscarPerfilUsuarioPorId } = require("../src/repositories/usuarioRepository");
process.env.JWT_SECRET = "segredo-de-teste-lista-obras";
const authMiddleware = require("../src/middlewares/authMiddleware");
const app = require("../index");

function criarLinhaSql(id, indice, tipo, detalhe = false) {
  const eventos = [
    {
      id: `${id}-evento-1`,
      criadoEm: "2026-12-01T10:15:30.000Z",
      tipo: "ANDAMENTO",
      descricao: "Materiais custaram R$ 20,00.",
      fotoUrl: null,
      visivelParaCliente: true,
      usuario: { nome: "Autora do evento" },
    },
    {
      id: `${id}-evento-2`,
      criadoEm: "2026-12-02 11:20:00",
      tipo: "ANOTACAO",
      descricao: "Etapa registrada.",
      fotoUrl: null,
      visivelParaCliente: indice === 1,
      usuario: { nome: null },
    },
  ];
  const linha = {
    id,
    empresaId: "empresa-1",
    nome: `Obra ${indice}`,
    clienteId: tipo === "CLIENTE" || indice === 1 ? "cliente-1" : null,
    descricao: `Descrição ${indice}`,
    endereco: `Rua ${indice}`,
    estado: "SP",
    cidade: "Campinas",
    bairro: "Centro",
    numero: String(indice),
    apartamento: null,
    bloco: null,
    semApartamento: true,
    semBloco: true,
    fotos: [],
    status: indice === 1 ? "EM_ANDAMENTO" : "AGENDADA",
    prazoFinal: new Date(`2027-02-0${indice}T12:00:00.000Z`),
    agendadaPara: new Date(`2027-01-0${indice}T12:00:00.000Z`),
    conclusaoConfirmadaEm: null,
    informacoesAdicionais: `Instrução ${indice}`,
    cliente: tipo === "COLABORADOR"
      ? { empresaId: "empresa-1", telefone: "(19) 99999-0000" }
      : linhaCliente(indice, tipo),
    eventos,
  };

  if (tipo !== "COLABORADOR" || detalhe) {
    Object.assign(linha, {
      valorTotal: new Prisma.Decimal(indice === 1 ? "1800.50" : "950.00"),
      valorBase: indice === 1 ? "1700.50" : new Prisma.Decimal("900.00"),
      quantidadeParcelas: 2,
      taxaJurosMensal: new Prisma.Decimal("0.00"),
      parcelas: [
        {
          id: `${id}-parcela-1`,
          numero: 1,
          valor: "900.25",
          situacao: "PENDENTE",
          vencimento: "2027-01-15T12:00:00.000Z",
          pagaEm: null,
          comprovanteUrl: null,
          comprovanteEnviadoEm: "2026-11-20T09:30:00+00:00",
          pagamentos: [
            { id: `${id}-pagamento-1`, valor: "25.25", status: "APROVADO" },
            { id: `${id}-pagamento-2`, valor: "10.00", status: "PENDENTE" },
          ],
        },
        {
          id: `${id}-parcela-2`,
          numero: 2,
          valor: new Prisma.Decimal("900.25"),
          situacao: "PAGA",
          vencimento: "2027-02-15 12:00:00",
          pagaEm: "2026-12-03T08:00:00.000Z",
          comprovanteUrl: null,
          comprovanteEnviadoEm: null,
          pagamentos: [],
        },
      ],
    });
  }

  if (tipo !== "COLABORADOR" || detalhe) {
    linha.escalas = [{
      dataInicio: "2026-11-01T08:00:00.000Z",
      funcionario: { id: `${id}-funcionario`, nome: "Responsável", funcao: "Mestre", ...(tipo === "ADMIN" ? { telefone: "(19) 3000-0000" } : {}) },
    }];
  } else {
    linha.escalas = [{
      dataInicio: "2026-11-01T08:00:00.000Z",
      funcionario: { id: `${id}-funcionario`, nome: "Responsável", funcao: "Mestre" },
    }];
  }

  if (detalhe) {
    linha.disponibilidades = [{
      funcionarioId: `${id}-funcionario-programado`,
      diaSemana: 1,
      funcionario: { id: `${id}-funcionario-programado`, nome: "Programado", funcao: "Pedreiro", telefone: null, fotoUrl: null, usuarioId: null },
    }];
  }
  if (tipo === "ADMIN") linha.convites = indice === 1 ? [{ id: `${id}-convite` }] : [];
  if (tipo === "CLIENTE" || (tipo === "ADMIN" && detalhe)) {
    linha.contrato = indice === 1 ? {
      id: `${id}-contrato`, termos: "Termos", arquivoUrl: "https://exemplo.test/contrato.pdf", criadoEm: "2026-10-01T00:00:00+00:00",
    } : null;
  }
  return linha;
}

function linhaCliente(indice, tipo) {
  if (tipo === "ADMIN" && indice === 2) return null;
  return { id: "cliente-1", nome: "Cliente Exemplo", empresaId: "empresa-1" };
}

function criarLinhasSql(tipo, detalhe = false) {
  return [criarLinhaSql("obra-1", 1, tipo, detalhe), criarLinhaSql("obra-2", 2, tipo, detalhe)];
}

function criarPerfilAdminSql() {
  return {
    id: "admin-perfil", empresaId: "empresa-perfil", nome: "Admin de Teste", email: "admin@perfil.test", tipo: "ADMIN",
    telefone: "11999990000", telefoneSecundario: null, fotoUrl: null, endereco: "Rua A", estado: "SP", cidade: "Campinas",
    bairro: "Centro", numero: "10", complemento: null, apartamento: null, bloco: null, semApartamento: true, semBloco: true, cpf: null,
    funcionario: null,
    empresa: {
      nome: "Empreiteira Teste", cnpj: "12345678000199", cpfResponsavel: null, telefone: "1130000000", telefoneSecundario: null,
      enderecoResponsavel: null, endereco: "Av. B", estado: "SP", cidade: "Campinas", bairro: "Jardim", numero: "20", complemento: null,
    },
  };
}

async function requisitarPelaRota(caminho, usuario, params = {}, query = {}, aquecerSessao = true) {
  const camada = app.router.stack.find((item) => item.route?.path === caminho && item.route.methods.get);
  assert.ok(camada, `A rota GET ${caminho} deve existir`);
  if (aquecerSessao) authMiddleware.guardarSessao(usuario);
  else authMiddleware.invalidarSessaoUsuario(usuario.id);
  const jwt = require("jsonwebtoken");
  const token = jwt.sign(usuario, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` }, params, query, body: {} };
  const res = {
    statusCode: 200,
    body: undefined,
    status(codigo) { this.statusCode = codigo; return this; },
    json(dados) { this.body = dados; return this; },
  };
  const handlers = camada.route.stack.map((item) => item.handle);
  async function executar(indice) {
    if (indice >= handlers.length) return;
    let chamadaSeguinte;
    await handlers[indice](req, res, () => {
      chamadaSeguinte = executar(indice + 1);
      return chamadaSeguinte;
    });
    if (chamadaSeguinte) await chamadaSeguinte;
  }
  await executar(0);
  return { status: res.statusCode, body: res.body };
}

describe("consultas agregadas de obras", () => {
  beforeEach(() => { chamadas.splice(0); linhasSql = []; linhasArquivadasSql = []; linhasPerfilSql = []; linhasAutenticacaoSql = []; });

  it("carrega a lista administrativa e suas relações em uma consulta", async () => {
    await listarObras("empresa-1", "admin-1", "ADMIN");
    assert.equal(chamadas.length, 1);
    const sql = chamadas[0].text;
    assert.match(sql, /FROM "Obra" o/);
    assert.match(sql, /FROM "ObraEvento" e/);
    assert.match(sql, /FROM "Parcela" p/);
    assert.match(sql, /FROM "Pagamento" pagamento/);
    assert.match(sql, /FROM "ObraEscala" escala/);
    assert.match(sql, /FROM "Convite" convite/);
    assert.match(sql, /o\."empresaId" = \$\d+/);
    assert.match(sql, /o\."excluidaEm" IS NULL/);
    assert.doesNotMatch(sql, /FROM "Contrato" contrato/);
  });

  it("mantém o filtro de cliente e contrato na lista do cliente", async () => {
    await listarObras("empresa-1", "cliente-1", "CLIENTE");
    assert.equal(chamadas.length, 1);
    assert.match(chamadas[0].text, /o\."clienteId" = \$\d+/);
    assert.match(chamadas[0].text, /FROM "Contrato" contrato/);
    assert.ok(chamadas[0].values.includes("cliente-1"));
  });

  it("mantém empresa e cliente como filtros do detalhe em uma consulta", async () => {
    assert.equal(await buscarObraPorId("obra-1", "empresa-1", "cliente-1", "CLIENTE"), null);
    assert.equal(chamadas.length, 1);
    assert.match(chamadas[0].text, /o\.id = \$\d+/);
    assert.match(chamadas[0].text, /o\."empresaId" = \$\d+/);
    assert.match(chamadas[0].text, /o\."clienteId" = \$\d+/);
    assert.match(chamadas[0].text, /FROM "DisponibilidadeFuncionario" disponibilidade/);
    assert.match(chamadas[0].text, /FROM "ObraEvento" e/);
  });

  it("aplica a escala ativa para limitar lista e detalhe do gerente", async () => {
    await listarObras("empresa-1", "gerente-1", "COLABORADOR");
    await buscarObraPorId("obra-1", "empresa-1", "gerente-1", "COLABORADOR");
    assert.equal(chamadas.length, 2);
    for (const consulta of chamadas) {
      assert.match(consulta.text, /EXISTS \(/);
      assert.match(consulta.text, /acesso\."dataFim" IS NULL/);
      assert.match(consulta.text, /funcionario\."usuarioId" = \$\d+/);
      assert.match(consulta.text, /funcionario\."empresaId" = \$\d+/);
    }
  });

  it("executa uma consulta de negócio em /obras e /notificacoes no cache frio", async () => {
    linhasSql = criarLinhasSql("ADMIN");
    const admin = { id: "admin-cache-count", email: "admin@teste.local", tipo: "ADMIN", empresaId: "empresa-cache-count" };
    const lista = await requisitarPelaRota("/obras", admin);
    assert.equal(lista.status, 200);
    assert.equal(chamadas.length, 1);
    assert.match(chamadas[0].text, /FROM "Obra" o/);

    chamadas.splice(0);
    linhasSql = [];
    const usuarioNotificacoes = { id: "usuario-notificacoes-count", email: "notificacoes@teste.local", tipo: "ADMIN", empresaId: "empresa-notificacoes-count" };
    const notificacoes = await requisitarPelaRota("/notificacoes", usuarioNotificacoes);
    assert.equal(notificacoes.status, 200);
    assert.deepEqual(notificacoes.body, []);
    assert.equal(chamadas.length, 1);
    assert.match(chamadas[0].text, /FROM "Notificacao" notificacao/);

    chamadas.splice(0);
    await requisitarPelaRota("/notificacoes", usuarioNotificacoes);
    assert.equal(chamadas.length, 0);
  });

  it("busca o perfil de /auth/me em uma consulta e limita a duas com sessão fria", async () => {
    const perfil = criarPerfilAdminSql();
    linhasPerfilSql = [perfil];
    linhasAutenticacaoSql = [{ id: perfil.id, empresaId: perfil.empresaId, email: perfil.email, tipo: perfil.tipo, funcionario: null }];

    assert.deepEqual(await buscarPerfilUsuarioPorId(perfil.id), perfil);
    assert.equal(chamadas.length, 1);
    assert.match(chamadas[0].text, /LEFT JOIN "Funcionario" funcionario/);
    assert.match(chamadas[0].text, /LEFT JOIN "Empresa" empresa/);

    chamadas.splice(0);
    const resposta = await requisitarPelaRota("/auth/me", perfil, {}, {}, false);
    assert.equal(resposta.status, 200);
    assert.equal(resposta.body.usuario.empresa.nome, "Empreiteira Teste");
    assert.equal(chamadas.length, 2);
    assert.match(chamadas[0].text, /LEFT JOIN "Funcionario" funcionario/);
    assert.match(chamadas[1].text, /LEFT JOIN "Empresa" empresa/);
  });

  it("lista obras arquivadas da empresa com relações em uma consulta SQL", async () => {
    const arquivada = criarLinhaSql("obra-arquivada", 1, "ADMIN", true);
    Object.assign(arquivada, {
      excluidaEm: new Date("2026-11-20T10:00:00.000Z"),
      exclusaoExpiraEm: new Date("2026-11-27T10:00:00.000Z"),
      exclusaoMotivo: "Solicitação administrativa",
    });
    linhasArquivadasSql = [arquivada];

    const resultado = await listarObrasArquivadas("empresa-1");
    assert.equal(chamadas.length, 1);
    assert.match(chamadas[0].text, /o\."empresaId" = \$\d+/);
    assert.match(chamadas[0].text, /o\."excluidaEm" IS NOT NULL/);
    assert.match(chamadas[0].text, /ORDER BY o\."excluidaEm" DESC/);
    assert.match(chamadas[0].text, /FROM "ObraEvento" e/);
    assert.match(chamadas[0].text, /FROM "DisponibilidadeFuncionario" disponibilidade/);
    assert.equal(resultado[0].id, "obra-arquivada");
    assert.equal(resultado[0].exclusaoMotivo, "Solicitação administrativa");
    assert.equal(resultado[0].restauravel, true);

    chamadas.splice(0);
    const admin = { id: "admin-arquivadas", email: "admin@arquivadas.test", tipo: "ADMIN", empresaId: "empresa-1" };
    const resposta = await requisitarPelaRota("/obras/arquivadas", admin);
    assert.equal(resposta.status, 200);
    assert.equal(resposta.body.length, 1);
    assert.equal(chamadas.length, 1);
  });

  for (const tipo of ["ADMIN", "CLIENTE", "COLABORADOR"]) {
    it(`formata duas linhas SQL realistas para ${tipo} na lista e no detalhe`, async () => {
      linhasSql = criarLinhasSql(tipo);
      const obras = await listarObras("empresa-1", tipo === "CLIENTE" ? "cliente-1" : `${tipo.toLowerCase()}-1`, tipo);
      assert.equal(chamadas.length, 1);
      assert.equal(obras.length, 2);
      assert.deepEqual(obras.map((obra) => ({
        id: obra.id,
        titulo: obra.titulo,
        status: obra.status,
        prazoISO: obra.prazoISO,
        agendadaPara: obra.agendadaPara,
        timeline: obra.timeline.map(({ data, hora, autor, tipo: tipoEvento, descricao }) => ({ data, hora, autor, tipo: tipoEvento, descricao })),
      })), [
        {
          id: "obra-1", titulo: "Obra 1", status: "Em andamento", prazoISO: "2027-02-01", agendadaPara: "2027-01-01",
          timeline: [
                { data: "01/12/2026", hora: "10:15", autor: "Autora do evento", tipo: "andamento", descricao: tipo === "COLABORADOR" ? "Materiais custaram [valor oculto]" : "Materiais custaram R$ 20,00." },
            { data: "02/12/2026", hora: "11:20", autor: "Sistema", tipo: "anotacao", descricao: "Etapa registrada." },
          ],
        },
        {
          id: "obra-2", titulo: "Obra 2", status: "Agendada", prazoISO: "2027-02-02", agendadaPara: "2027-01-02",
          timeline: tipo === "CLIENTE"
            ? [{ data: "01/12/2026", hora: "10:15", autor: "Autora do evento", tipo: "andamento", descricao: "Materiais custaram R$ 20,00." }]
            : [
                { data: "01/12/2026", hora: "10:15", autor: "Autora do evento", tipo: "andamento", descricao: tipo === "COLABORADOR" ? "Materiais custaram [valor oculto]" : "Materiais custaram R$ 20,00." },
                { data: "02/12/2026", hora: "11:20", autor: "Sistema", tipo: "anotacao", descricao: "Etapa registrada." },
              ],
        },
      ]);
      assert.deepEqual(obras[0].colaboradores, [{ id: "obra-1-funcionario", nome: "Responsável", funcao: "Mestre", ...(tipo === "ADMIN" ? { telefone: "(19) 3000-0000" } : {}) }]);
      assert.deepEqual(obras[0].funcionariosProgramados, []);

      if (tipo === "COLABORADOR") {
        assert.equal(obras[0].telefoneCliente, "(19) 99999-0000");
        assert.equal("parcelas" in obras[0], false);
        assert.equal("contrato" in obras[0], false);
      } else {
        assert.equal(obras[0].parcelas.length, 2);
        assert.equal(obras[0].parcelas[0].valor, 900.25);
        assert.equal(obras[0].parcelas[0].valorPago, 25.25);
        assert.equal(obras[0].parcelas[0].valorReservado, 10);
        assert.equal(obras[0].parcelas[0].vencimentoISO, "2027-01-15");
        assert.equal(obras[0].parcelas[1].pagamento, "03/12/2026");
        assert.equal(obras[0].valorTotal, 1800.5);
      }
      if (tipo === "CLIENTE") {
        assert.deepEqual(obras[0].contrato, {
          id: "obra-1-contrato", termos: "Termos", arquivoUrl: "https://exemplo.test/contrato.pdf", criadoEm: "2026-10-01T00:00:00.000Z",
        });
        assert.equal(obras[1].contrato, null);
      }
      if (tipo === "ADMIN") {
        assert.equal(obras[0].conviteClientePendente, true);
        assert.equal(obras[1].cliente, null);
        assert.equal(obras[0].contrato, null);
      }

      linhasSql = criarLinhasSql(tipo, true);
      chamadas.splice(0);
      const detalhe = await buscarObraPorId("obra-1", "empresa-1", tipo === "CLIENTE" ? "cliente-1" : `${tipo.toLowerCase()}-1`, tipo);
      assert.equal(chamadas.length, 1);
      assert.equal(detalhe.id, "obra-1");
      assert.equal(detalhe.timeline[0].hora, "10:15");
      assert.deepEqual(detalhe.funcionariosProgramados.map((funcionario) => funcionario.nome), ["Programado"]);
      if (tipo === "COLABORADOR") {
        assert.equal("valorTotal" in detalhe, false);
        assert.equal("contrato" in detalhe, false);
      } else {
        assert.equal(detalhe.parcelas.length, 2);
        assert.equal(detalhe.contrato.criadoEm, "2026-10-01T00:00:00.000Z");
      }

      chamadas.splice(0);
      const usuario = {
        id: tipo === "CLIENTE" ? "cliente-1" : `${tipo.toLowerCase()}-1`,
        email: `${tipo.toLowerCase()}@teste.local`,
        tipo,
        empresaId: "empresa-1",
      };
      const respostaRota = await requisitarPelaRota("/obras/:id", usuario, { id: "obra-1" });
      assert.equal(respostaRota.status, 200);
      assert.equal(respostaRota.body.id, "obra-1");
      assert.equal(respostaRota.body.timeline[0].hora, "10:15");
      assert.equal(chamadas.length, 1);
    });
  }

  it("trata datas inválidas, datas nulas e relações opcionais sem lançar", async () => {
    linhasSql = criarLinhasSql("CLIENTE");
    const obra = linhasSql[0];
    obra.prazoFinal = "data inválida";
    obra.agendadaPara = null;
    obra.conclusaoConfirmadaEm = new Date("data inválida");
    obra.eventos[0].criadoEm = "data inválida";
    obra.eventos[0].usuario = null;
    obra.parcelas[0].vencimento = "data inválida";
    obra.parcelas[0].pagaEm = null;
    obra.contrato.criadoEm = "data inválida";

    const [formatada] = await listarObras("empresa-1", "cliente-1", "CLIENTE");
    assert.equal(formatada.prazo, null);
    assert.equal(formatada.prazoISO, "");
    assert.equal(formatada.agendadaPara, null);
    assert.equal(formatada.conclusaoConfirmadaEm, null);
    const eventoInvalido = formatada.timeline.find((evento) => evento.id === "obra-1-evento-1");
    assert.equal(eventoInvalido.data, null);
    assert.equal(eventoInvalido.hora, "");
    assert.equal(eventoInvalido.autor, "Sistema");
    assert.equal(formatada.parcelas[0].vencimento, null);
    assert.equal(formatada.parcelas[0].vencimentoISO, "");
    assert.equal(formatada.contrato.criadoEm, null);
  });

  // Garante a exposição somente leitura de resumoParcelas na listagem GET /obras e o isolamento por perfil.
  it("expõe resumoParcelas em GET /obras para ADMIN e CLIENTE e omite para COLABORADOR", async () => {
    // Caso 1: nenhuma parcela paga (12 parcelas).
    const obraNenhumaPaga = criarLinhaSql("obra-nenhuma", 1, "ADMIN");
    obraNenhumaPaga.quantidadeParcelas = 12;
    obraNenhumaPaga.resumoParcelasSql = {
      total: 12,
      pagas: 0,
      valorParcelaPadrao: "1000.00",
      ultimasPagas: [],
      proximaNaoPaga: { numero: 1, valor: "1000.00", situacao: "PENDENTE", vencimento: "2028-01-10T12:00:00.000Z" },
    };

    // Caso 2: obra com mais de 2 parcelas (12), duas primeiras pagas e 3ª atrasada (mesmo com parcelas[] limitado a 2).
    const obraMaisDeDuas = criarLinhaSql("obra-12", 2, "CLIENTE");
    obraMaisDeDuas.quantidadeParcelas = 12;
    obraMaisDeDuas.parcelas = obraMaisDeDuas.parcelas.map((parcela) => ({ ...parcela, situacao: "PAGA" }));
    obraMaisDeDuas.resumoParcelasSql = {
      total: 12,
      pagas: 2,
      valorParcelaPadrao: "1000.00",
      ultimasPagas: [
        { numero: 1, valor: "1000.00", situacao: "PAGA", vencimento: "2025-01-10T12:00:00.000Z" },
        { numero: 2, valor: "1000.00", situacao: "PAGA", vencimento: "2025-02-10T12:00:00.000Z" },
      ],
      proximaNaoPaga: { numero: 3, valor: "1000.00", situacao: "PENDENTE", vencimento: "2025-03-10T12:00:00.000Z" },
    };

    // Caso 3: todas pagas com diferença de centavos na última parcela (12ª).
    const obraTodasPagas = criarLinhaSql("obra-quitada", 1, "ADMIN");
    obraTodasPagas.quantidadeParcelas = 12;
    obraTodasPagas.resumoParcelasSql = {
      total: 12,
      pagas: 12,
      valorParcelaPadrao: "833.33",
      ultimasPagas: [
        { numero: 11, valor: "833.33", situacao: "PAGA", vencimento: "2026-11-10T12:00:00.000Z" },
        { numero: 12, valor: "833.37", situacao: "PAGA", vencimento: "2026-12-10T12:00:00.000Z" },
      ],
      proximaNaoPaga: null,
    };

    // Caso 4: algumas pagas (1ª paga e 2ª pendente futura).
    const obraAlgumasPagas = criarLinhaSql("obra-parcial", 1, "CLIENTE");
    obraAlgumasPagas.quantidadeParcelas = 4;
    obraAlgumasPagas.resumoParcelasSql = {
      total: 4,
      pagas: 1,
      valorParcelaPadrao: "500.00",
      ultimasPagas: [
        { numero: 1, valor: "500.00", situacao: "PAGA", vencimento: "2026-01-10T12:00:00.000Z" },
      ],
      proximaNaoPaga: { numero: 2, valor: "500.00", situacao: "PENDENTE", vencimento: "2028-02-10T12:00:00.000Z" },
    };

    linhasSql = [obraNenhumaPaga, obraMaisDeDuas, obraTodasPagas, obraAlgumasPagas];
    const admin = { id: "admin-resumo", email: "admin@resumo.test", tipo: "ADMIN", empresaId: "empresa-1" };
    const respostaAdmin = await requisitarPelaRota("/obras", admin);
    assert.equal(respostaAdmin.status, 200);
    assert.match(chamadas[0].text, /resumoParcelasSql/);

    // Valida caso 1: nenhuma paga.
    assert.deepEqual(respostaAdmin.body[0].resumoParcelas, {
      total: 12,
      pagas: 0,
      valorParcelaBase: 1000,
      ultimaPaga: null,
      penultimaPaga: null,
      proximaNaoPaga: { numero: 1, valor: 1000, situacao: "pendente", estado: "Pendente" },
    });

    // Valida caso 2: obra > 2 parcelas com 2 primeiras pagas e 3ª atrasada (preserva parcelas[] existente com 2 itens).
    assert.equal(respostaAdmin.body[1].parcelas.length, 2);
    assert.deepEqual(respostaAdmin.body[1].resumoParcelas, {
      total: 12,
      pagas: 2,
      valorParcelaBase: 1000,
      ultimaPaga: { numero: 2, valor: 1000, situacao: "paga", estado: "Pago" },
      penultimaPaga: { numero: 1, valor: 1000, situacao: "paga", estado: "Pago" },
      proximaNaoPaga: { numero: 3, valor: 1000, situacao: "atrasada", estado: "Atrasada" },
    });

    // Valida caso 3: todas pagas preservando centavos diferentes da última parcela.
    assert.deepEqual(respostaAdmin.body[2].resumoParcelas, {
      total: 12,
      pagas: 12,
      valorParcelaBase: 833.33,
      ultimaPaga: { numero: 12, valor: 833.37, situacao: "paga", estado: "Pago" },
      penultimaPaga: { numero: 11, valor: 833.33, situacao: "paga", estado: "Pago" },
      proximaNaoPaga: null,
    });

    // Valida caso 4: algumas pagas com próxima parcela pendente.
    assert.deepEqual(respostaAdmin.body[3].resumoParcelas, {
      total: 4,
      pagas: 1,
      valorParcelaBase: 500,
      ultimaPaga: { numero: 1, valor: 500, situacao: "paga", estado: "Pago" },
      penultimaPaga: null,
      proximaNaoPaga: { numero: 2, valor: 500, situacao: "pendente", estado: "Pendente" },
    });

    // Garante que CLIENTE recebe o resumo filtrado por clienteId e empresaId.
    chamadas.splice(0);
    linhasSql = [obraAlgumasPagas];
    const cliente = { id: "cliente-1", email: "cliente@resumo.test", tipo: "CLIENTE", empresaId: "empresa-1" };
    const respostaCliente = await requisitarPelaRota("/obras", cliente);
    assert.equal(respostaCliente.status, 200);
    assert.match(chamadas[0].text, /o\."clienteId" = \$\d+/);
    assert.equal(respostaCliente.body[0].resumoParcelas.pagas, 1);

    // Garante RN15: COLABORADOR nunca recebe resumoParcelas nem valores financeiros.
    chamadas.splice(0);
    linhasSql = criarLinhasSql("COLABORADOR");
    const gerente = { id: "gerente-resumo", email: "gerente@resumo.test", tipo: "COLABORADOR", empresaId: "empresa-1" };
    const respostaGerente = await requisitarPelaRota("/obras", gerente);
    assert.equal(respostaGerente.status, 200);
    assert.doesNotMatch(chamadas[0].text, /resumoParcelasSql/);
    assert.equal("resumoParcelas" in respostaGerente.body[0], false);
    assert.equal("valorTotal" in respostaGerente.body[0], false);
  });
});
