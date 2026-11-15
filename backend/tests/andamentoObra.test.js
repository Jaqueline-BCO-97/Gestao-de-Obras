const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const empresaA = "empresa-andamento-a";
const empresaB = "empresa-andamento-b";
const obras = [
  { id: "obra-a", empresaId: empresaA },
  { id: "obra-a-sem-alocacao", empresaId: empresaA },
  { id: "obra-b", empresaId: empresaB },
];
const funcionarios = [
  { id: "funcionario-a", empresaId: empresaA, usuarioId: "colaborador-a", ativo: true, usuario: { empresaId: empresaA, tipo: "COLABORADOR" } },
  { id: "funcionario-b", empresaId: empresaB, usuarioId: "colaborador-b", ativo: true, usuario: { empresaId: empresaB, tipo: "COLABORADOR" } },
  { id: "funcionario-vinculo-invalido", empresaId: empresaA, usuarioId: "admin-b", usuario: { empresaId: empresaB, tipo: "ADMIN" } },
];
const escalasAbertas = [{ id: "escala-a", obraId: "obra-a", funcionarioId: "funcionario-a", dataFim: null }];
let eventos;

function localizar(lista, where) {
  return lista.find((item) => Object.entries(where).every(([chave, valor]) => item[chave] === valor)) || null;
}

const prismaFalso = {
  obra: { findFirst: async ({ where }) => localizar(obras, where) },
  funcionario: { findFirst: async ({ where }) => localizar(funcionarios, where) },
  obraEscala: { findFirst: async ({ where }) => localizar(escalasAbertas, where) },
  obraEvento: {
    create: async ({ data }) => {
      const evento = { id: `evento-${eventos.length + 1}`, criadoEm: new Date(), ...data };
      eventos.push(evento);
      return evento;
    },
  },
  $transaction: (callback) => callback(prismaFalso),
};

const dbPath = require.resolve("../src/config/db");
const usuarioRepositoryPath = require.resolve("../src/repositories/usuarioRepository");
const perfis = [
  { id: "colaborador-a", email: "colaborador-a@teste.local", tipo: "COLABORADOR", empresaId: empresaA },
  { id: "colaborador-b", email: "colaborador-b@teste.local", tipo: "COLABORADOR", empresaId: empresaB },
  { id: "cliente-a", email: "cliente-a@teste.local", tipo: "CLIENTE", empresaId: empresaA },
  { id: "admin-a", email: "admin-a@teste.local", tipo: "ADMIN", empresaId: empresaA },
];
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getPrisma: () => prismaFalso, isDbConfigured: () => true },
};
require.cache[usuarioRepositoryPath] = {
  id: usuarioRepositoryPath,
  filename: usuarioRepositoryPath,
  loaded: true,
  exports: {
    buscarPerfilUsuarioPorId: async (id) => localizar(perfis, { id }),
    buscarFuncionarioPorUsuarioId: async (usuarioId) => localizar(funcionarios, { usuarioId }),
    listarUsuarios: async () => [],
    buscarUsuarioPorEmail: async () => null,
    buscarUsuarioPorId: async () => null,
    atualizarSenhaUsuario: async () => null,
    criarUsuarioColaborador: async () => null,
  },
};
process.env.JWT_SECRET = "segredo-teste-andamento";
const { registrarAndamento } = require("../src/repositories/obraRepository");
const app = require("../index");

function tokenDo(usuarioId) {
  const usuario = localizar(perfis, { id: usuarioId });
  return jwt.sign({ id: usuario.id, email: usuario.email, tipo: usuario.tipo, empresaId: usuario.empresaId }, process.env.JWT_SECRET);
}

async function chamarRotaAndamento({ usuarioId, body, obraId = "obra-a", contentType = "application/json" }) {
  const camada = app.router.stack.find((item) => item.route?.path === "/obras/:id/andamento" && item.route.methods.post);
  assert.ok(camada, "Rota POST /obras/:id/andamento deve estar registrada");
  const handlers = camada.route.stack.map((item) => item.handle);
  const req = {
    headers: usuarioId ? { authorization: `Bearer ${tokenDo(usuarioId)}`, "content-type": contentType } : { "content-type": contentType },
    params: { id: obraId },
    body,
    is: (tipo) => contentType.includes(tipo),
  };
  const res = {
    statusCode: 200,
    body: undefined,
    status(codigo) { this.statusCode = codigo; return this; },
    json(dados) { this.body = dados; return this; },
  };

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
  return res;
}

describe("Issue #17 — persistência do registro de andamento", () => {
  beforeEach(() => { eventos = []; });

  it("persiste anotação com empresa, autor e visibilidade para o cliente", async () => {
    const evento = await registrarAndamento({
      obraId: "obra-a",
      empresaId: empresaA,
      usuarioId: "colaborador-a",
      tipo: "ANOTACAO",
      descricao: "Alvenaria concluída.",
    });

    assert.equal(evento.obraId, "obra-a");
    assert.equal(evento.empresaId, empresaA);
    assert.equal(evento.usuarioId, "colaborador-a");
    assert.equal(evento.visivelParaCliente, true);
    assert.equal(evento.fotoUrl, null);
    assert.equal(eventos.length, 1);
  });

  it("não encontra obra inexistente ou pertencente a outra empresa", async () => {
    assert.equal(await registrarAndamento({ obraId: "obra-b", empresaId: empresaA, usuarioId: "colaborador-a", tipo: "ATUALIZACAO", descricao: "Nota" }), null);
    assert.equal(await registrarAndamento({ obraId: "inexistente", empresaId: empresaA, usuarioId: "colaborador-a", tipo: "ATUALIZACAO", descricao: "Nota" }), null);
    assert.equal(eventos.length, 0);
  });

  it("rejeita usuário sem cadastro de colaborador consistente na empresa", async () => {
    await assert.rejects(
      registrarAndamento({ obraId: "obra-a", empresaId: empresaA, usuarioId: "admin-b", tipo: "ANOTACAO", descricao: "Nota" }),
      { code: "COLABORADOR_SEM_VINCULO" },
    );
    assert.equal(eventos.length, 0);
  });

  it("rejeita colaborador sem alocação aberta na obra", async () => {
    await assert.rejects(
      registrarAndamento({ obraId: "obra-a-sem-alocacao", empresaId: empresaA, usuarioId: "colaborador-a", tipo: "ATUALIZACAO", descricao: "Nota" }),
      { code: "COLABORADOR_SEM_ALOCACAO" },
    );
    assert.equal(eventos.length, 0);
  });

  it("rota HTTP aplica autenticação, papel e validação de entrada", async () => {
    const semToken = await chamarRotaAndamento({ body: { descricao: "Nota" } });
    assert.equal(semToken.statusCode, 401);

    const cliente = await chamarRotaAndamento({ usuarioId: "cliente-a", body: { descricao: "Nota" } });
    assert.equal(cliente.statusCode, 403);
    const admin = await chamarRotaAndamento({ usuarioId: "admin-a", body: { descricao: "Nota" } });
    assert.equal(admin.statusCode, 403);

    const semDescricao = await chamarRotaAndamento({ usuarioId: "colaborador-a", body: { descricao: " " } });
    assert.equal(semDescricao.statusCode, 400);
    const descricaoLonga = await chamarRotaAndamento({ usuarioId: "colaborador-a", body: { descricao: "x".repeat(2001) } });
    assert.equal(descricaoLonga.statusCode, 400);
    const tipoInvalido = await chamarRotaAndamento({ usuarioId: "colaborador-a", body: { descricao: "Nota", tipo: "PAGAMENTO" } });
    assert.equal(tipoInvalido.statusCode, 400);

    const valido = await chamarRotaAndamento({ usuarioId: "colaborador-a", body: { descricao: "Etapa concluída", tipo: "ANOTACAO" } });
    assert.equal(valido.statusCode, 201);
    assert.equal(valido.body.evento.visivelParaCliente, true);
  });

  it("rota retorna 403 sem alocação, 404 fora da empresa e 501 para foto sem armazenamento", async () => {
    const semAlocacao = await chamarRotaAndamento({ usuarioId: "colaborador-a", obraId: "obra-a-sem-alocacao", body: { descricao: "Nota" } });
    assert.equal(semAlocacao.statusCode, 403);

    const cruzada = await chamarRotaAndamento({ usuarioId: "colaborador-b", body: { descricao: "Nota" } });
    assert.equal(cruzada.statusCode, 404);

    const foto = await chamarRotaAndamento({ usuarioId: "colaborador-a", body: { descricao: "Nota", fotoUrl: "https://example.test/foto.jpg" } });
    assert.equal(foto.statusCode, 501);
  });
});

// Evita deixar o mock global carregado caso a suíte inclua outros testes.
process.on("exit", () => {
  delete require.cache[dbPath];
  delete require.cache[usuarioRepositoryPath];
});
