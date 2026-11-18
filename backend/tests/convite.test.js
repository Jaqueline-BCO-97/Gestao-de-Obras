const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");

const empresaId = "empresa-convite-a";
const administrador = { id: "admin-convite-a", empresaId, nome: "Admin", email: "admin@convite.local", tipo: "ADMIN" };
let usuarios;
let obras;
let convites;
let funcionarios;
let escalas;
let eventos;

function selecionar(registro, select) {
  if (!registro || !select) return registro;
  return Object.fromEntries(Object.entries(select).filter(([, incluir]) => incluir === true).map(([campo]) => [campo, registro[campo]]));
}

function criarPrisma() {
  const prisma = {
    usuario: {
      findUnique: async ({ where, select }) => selecionar(usuarios.find((item) => Object.entries(where).every(([chave, valor]) => item[chave] === valor)) || null, select),
      create: async ({ data }) => { const item = { id: `usuario-${usuarios.length}`, criadoEm: new Date(), ...data }; usuarios.push(item); return item; },
    },
    obra: {
      findFirst: async ({ where, include }) => {
        const obra = obras.find((item) => Object.entries(where).every(([chave, valor]) => item[chave] === valor)) || null;
        if (!obra || !include) return obra;
        return { ...obra, empresa: { nome: "Empreiteira A" }, cliente: null };
      },
      updateMany: async ({ where, data }) => {
        const obra = obras.find((item) => Object.entries(where).every(([chave, valor]) => item[chave] === valor));
        if (!obra) return { count: 0 };
        Object.assign(obra, data);
        return { count: 1 };
      },
    },
    convite: {
      findUnique: async ({ where, include }) => {
        const convite = convites.find((item) => Object.entries(where).every(([chave, valor]) => item[chave] === valor)) || null;
        if (!convite || !include) return convite;
        return { ...convite, empresa: { nome: "Empreiteira A" }, obra: { nome: obras.find((obra) => obra.id === convite.obraId)?.nome } };
      },
      findFirst: async ({ where }) => convites.find((item) => Object.entries(where).every(([chave, valor]) => {
        if (chave === "expiraEm" && valor?.gt) return item.expiraEm > valor.gt;
        return item[chave] === valor;
      })) || null,
      create: async ({ data }) => { const item = { id: `convite-${convites.length + 1}`, usadoEm: null, ...data }; convites.push(item); return item; },
      updateMany: async ({ where, data }) => {
        const item = convites.find((convite) => Object.entries(where).every(([chave, valor]) => {
          if (chave === "expiraEm" && valor?.gt) return convite.expiraEm > valor.gt;
          return convite[chave] === valor;
        }));
        if (!item) return { count: 0 };
        Object.assign(item, data);
        return { count: 1 };
      },
    },
    funcionario: {
      findUnique: async ({ where }) => funcionarios.find((item) => Object.entries(where).every(([chave, valor]) => item[chave] === valor)) || null,
      create: async ({ data }) => { const item = { id: `funcionario-${funcionarios.length + 1}`, ativo: true, ...data }; funcionarios.push(item); return item; },
    },
    obraEscala: {
      findFirst: async ({ where }) => escalas.find((item) => Object.entries(where).every(([chave, valor]) => item[chave] === valor)) || null,
      create: async ({ data }) => { const item = { id: `escala-${escalas.length + 1}`, ...data }; escalas.push(item); return item; },
    },
    obraEvento: {
      create: async ({ data }) => { const item = { id: `evento-${eventos.length + 1}`, ...data }; eventos.push(item); return item; },
    },
    $transaction: async (callback) => callback(prisma),
  };
  return prisma;
}

const dbPath = require.resolve("../src/config/db");
const usuarioRepositoryPath = require.resolve("../src/repositories/usuarioRepository");
const prisma = criarPrisma();
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { getPrisma: () => prisma, isDbConfigured: () => true } };
require.cache[usuarioRepositoryPath] = {
  id: usuarioRepositoryPath, filename: usuarioRepositoryPath, loaded: true,
  exports: {
    listarUsuarios: async () => [], buscarUsuarioPorEmail: async () => null, buscarUsuarioPorId: async () => null,
    buscarPerfilUsuarioPorId: async (id) => selecionar(usuarios.find((item) => item.id === id) || null, { id: true, empresaId: true, nome: true, email: true, tipo: true }),
    buscarFuncionarioPorUsuarioId: async (usuarioId) => funcionarios.find((item) => item.usuarioId === usuarioId) || null,
    atualizarSenhaUsuario: async () => null, criarUsuarioColaborador: async () => null,
  },
};
process.env.JWT_SECRET = "segredo-testes-convite";
const app = require("../index");

function token(usuario = administrador) {
  return jwt.sign({ id: usuario.id, email: usuario.email, tipo: usuario.tipo, empresaId: usuario.empresaId }, process.env.JWT_SECRET);
}

async function chamar(metodo, caminho, { body = {}, params = {}, usuario = administrador } = {}) {
  const camada = app.router.stack.find((item) => item.route?.path === caminho && item.route.methods[metodo.toLowerCase()]);
  assert.ok(camada, `Rota ${metodo} ${caminho} deve existir`);
  const req = { headers: usuario ? { authorization: `Bearer ${token(usuario)}` } : {}, body, params, get: () => "localhost:3000", protocol: "http" };
  const res = { statusCode: 200, body: undefined, status(codigo) { this.statusCode = codigo; return this; }, json(dados) { this.body = dados; return this; } };
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

describe("Convites de cliente e gerente por obra", () => {
  beforeEach(() => {
    usuarios = [{ ...administrador }];
    obras = [{ id: "obra-convite-a", empresaId, nome: "Obra A", clienteId: null }];
    convites = [];
    funcionarios = [];
    escalas = [];
    eventos = [];
  });

  it("cria conta de cliente, limita o vínculo à obra convidada e consome o link uma vez", async () => {
    const criado = await chamar("POST", "/convites/cliente", { body: { obraId: "obra-convite-a", nome: "Cliente A", email: "cliente@teste.local" } });
    assert.equal(criado.statusCode, 201);
    assert.match(criado.body.convite.link, /^http:\/\/localhost:5173\/convite\//);
    const codigo = criado.body.convite.link.split("/").at(-1);
    const consulta = await chamar("GET", "/convites/:token", { params: { token: codigo }, usuario: null });
    assert.equal(consulta.statusCode, 200);
    assert.equal(consulta.body.obra, "Obra A");

    const aceite = await chamar("POST", "/convites/:token/aceitar", { params: { token: codigo }, body: { senha: "senha-segura-123" }, usuario: null });
    assert.equal(aceite.statusCode, 200);
    assert.equal(aceite.body.usuario.tipo, "CLIENTE");
    assert.equal(obras[0].clienteId, aceite.body.usuario.id);
    assert.equal(convites[0].usadoEm instanceof Date, true);

    const reutilizado = await chamar("POST", "/convites/:token/aceitar", { params: { token: codigo }, body: { senha: "senha-segura-123" }, usuario: null });
    assert.equal(reutilizado.statusCode, 410);
    assert.equal(usuarios.filter((item) => item.tipo === "CLIENTE").length, 1);
  });

  it("cria gerente responsável e concede escala somente para a obra do convite", async () => {
    const criado = await chamar("POST", "/convites/gerente", { body: { obraId: "obra-convite-a", nome: "Gerente A", email: "gerente@teste.local", funcao: "Gerente de obras" } });
    assert.equal(criado.statusCode, 201);
    const codigo = criado.body.convite.link.split("/").at(-1);
    const aceite = await chamar("POST", "/convites/:token/aceitar", { params: { token: codigo }, body: { senha: "senha-segura-123" }, usuario: null });
    assert.equal(aceite.statusCode, 200);
    assert.equal(aceite.body.usuario.tipo, "COLABORADOR");
    assert.equal(funcionarios[0].nivel, "RESPONSAVEL");
    assert.equal(escalas.length, 1);
    assert.equal(escalas[0].obraId, "obra-convite-a");
    assert.equal(escalas[0].funcionarioId, funcionarios[0].id);
    assert.equal(eventos.length, 1);
    assert.equal(eventos[0].tipo, "EQUIPE");
    assert.equal(eventos[0].visivelParaCliente, false);
  });

  it("nega criação de convite sem sessão administrativa e convite para outra empresa", async () => {
    const semSessao = await chamar("POST", "/convites/cliente", { body: { obraId: "obra-convite-a", nome: "Cliente", email: "cliente@teste.local" }, usuario: null });
    assert.equal(semSessao.statusCode, 401);
    const obraAlheia = await chamar("POST", "/convites/cliente", { body: { obraId: "obra-fora-da-empresa", nome: "Cliente", email: "cliente@teste.local" } });
    assert.equal(obraAlheia.statusCode, 404);
    assert.equal(convites.length, 0);
  });
});
