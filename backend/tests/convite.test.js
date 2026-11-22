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
let parcelas;
let contratos;
let notificacoes;

function selecionar(registro, select) {
  if (!registro || !select) return registro;
  return Object.fromEntries(Object.entries(select).filter(([, incluir]) => incluir === true).map(([campo]) => [campo, registro[campo]]));
}

function criarPrisma() {
  const prisma = {
    usuario: {
      findUnique: async ({ where, select }) => selecionar(usuarios.find((item) => Object.entries(where).every(([chave, valor]) => item[chave] === valor)) || null, select),
      findMany: async ({ where }) => usuarios.filter((item) => item.empresaId === where.empresaId && item.tipo === where.tipo).map(({ id }) => ({ id })),
      create: async ({ data }) => { const item = { id: `usuario-${usuarios.length}`, criadoEm: new Date(), ...data }; usuarios.push(item); return item; },
      update: async ({ where, data }) => { const item = usuarios.find((usuario) => usuario.id === where.id); Object.assign(item, data); return item; },
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
      update: async ({ where, data }) => {
        const obra = obras.find((item) => item.id === where.id);
        if (!obra) throw Object.assign(new Error("Obra ausente"), { code: "P2025" });
        Object.assign(obra, data);
        return obra;
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
    parcela: {
      count: async ({ where }) => parcelas.filter((item) => item.obraId === where.obraId && (!where.situacao || item.situacao === where.situacao)).length,
      findMany: async ({ where }) => parcelas.filter((item) => item.obraId === where.obraId).map((item) => ({ ...item, pagamentos: [] })),
      update: async ({ where, data }) => { const item = parcelas.find((parcela) => parcela.id === where.id); Object.assign(item, data); return item; },
      create: async ({ data }) => { const item = { id: `parcela-${parcelas.length + 1}`, situacao: "PENDENTE", ...data }; parcelas.push(item); return item; },
      delete: async ({ where }) => { const indice = parcelas.findIndex((item) => item.id === where.id); return parcelas.splice(indice, 1)[0]; },
      updateMany: async ({ where, data }) => { const item = parcelas.find((parcela) => parcela.obraId === where.obraId && parcela.numero === where.numero); if (!item) return { count: 0 }; Object.assign(item, data); return { count: 1 }; },
    },
    contrato: {
      upsert: async ({ where, create, update }) => { let item = contratos.find((contrato) => contrato.obraId === where.obraId); if (item) Object.assign(item, update); else { item = { id: `contrato-${contratos.length + 1}`, ...create }; contratos.push(item); } return item; },
    },
    pagamento: { count: async () => 0 },
    notificacao: {
      create: async ({ data }) => { const item = { id: `notificacao-${notificacoes.length + 1}`, ...data }; notificacoes.push(item); return item; },
      createMany: async ({ data }) => { notificacoes.push(...data); return { count: data.length }; },
    },
    $transaction: async (callback) => callback(prisma),
  };
  return prisma;
}

const dbPath = require.resolve("../src/config/db");
const usuarioRepositoryPath = require.resolve("../src/repositories/usuarioRepository");
const cloudinaryServicePath = require.resolve("../src/services/cloudinaryService");
const prisma = criarPrisma();
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { getPrisma: () => prisma, isDbConfigured: () => true } };
require.cache[cloudinaryServicePath] = { id: cloudinaryServicePath, filename: cloudinaryServicePath, loaded: true, exports: { enviarContratoObra: async () => "https://res.cloudinary.com/teste/raw/upload/contrato.pdf", enviarFotoObra: async () => "https://res.cloudinary.com/teste/image/upload/foto.png" } };
require.cache[usuarioRepositoryPath] = {
  id: usuarioRepositoryPath, filename: usuarioRepositoryPath, loaded: true,
  exports: {
    listarUsuarios: async () => [], buscarUsuarioPorEmail: async () => null, buscarUsuarioPorId: async () => null,
    buscarAutenticacaoUsuarioPorId: async (id) => {
      const usuario = usuarios.find((item) => item.id === id);
      if (!usuario) return null;
      const funcionario = funcionarios.find((item) => item.usuarioId === id);
      return { id: usuario.id, email: usuario.email, tipo: usuario.tipo, empresaId: usuario.empresaId, funcionario: funcionario ? { empresaId: funcionario.empresaId, ativo: funcionario.ativo } : null };
    },
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
    obras = [{ id: "obra-convite-a", empresaId, nome: "Obra A", clienteId: null, valorBase: "1000.00", valorTotal: "1000.00", excluidaEm: null }];
    convites = [];
    funcionarios = [];
    escalas = [];
    eventos = [];
    parcelas = [
      { id: "parcela-1", obraId: "obra-convite-a", numero: 1, valor: "500.00", situacao: "PENDENTE" },
      { id: "parcela-2", obraId: "obra-convite-a", numero: 2, valor: "500.00", situacao: "PENDENTE" },
    ];
    contratos = [];
    notificacoes = [];
  });

  it("cria conta de cliente, limita o vínculo à obra convidada e consome o link uma vez", async () => {
    const criado = await chamar("POST", "/convites/cliente", { body: { obraId: "obra-convite-a", nome: "Cliente A", email: "cliente@teste.local", telefone: "11987654321", endereco: "Rua A", estado: "SP", cidade: "Santos", bairro: "Centro", numero: "100", apartamento: "12", bloco: "A", semApartamento: false, semBloco: false, quantidadeParcelas: 3, vencimentoInicial: "2026-12-10", contrato: { data: "data:application/pdf;base64,AA==", mimeType: "application/pdf" } } });
    assert.equal(criado.statusCode, 201);
    assert.match(criado.body.convite.link, /^http:\/\/localhost:5173\/convite\//);
    const codigo = criado.body.convite.link.split("/").at(-1);
    const consulta = await chamar("GET", "/convites/:token", { params: { token: codigo }, usuario: null });
    assert.equal(consulta.statusCode, 200);
    assert.equal(consulta.body.obra, "Obra A");

    const aceite = await chamar("POST", "/convites/:token/aceitar", { params: { token: codigo }, body: { senha: "senha-segura-123" }, usuario: null });
    assert.equal(aceite.statusCode, 200);
    assert.equal(aceite.body.usuario.tipo, "CLIENTE");
    assert.equal(usuarios.find((item) => item.id === aceite.body.usuario.id).cidade, "Santos");
    assert.equal(obras[0].clienteId, aceite.body.usuario.id);
    assert.equal(obras[0].quantidadeParcelas, 3);
    assert.equal(parcelas.length, 3);
    assert.equal(parcelas[0].numero, 1);
    assert.equal(parcelas[2].numero, 3);
    assert.equal(contratos[0].arquivoUrl, "https://res.cloudinary.com/teste/raw/upload/contrato.pdf");
    assert.equal(convites[0].usadoEm instanceof Date, true);

    const reutilizado = await chamar("POST", "/convites/:token/aceitar", { params: { token: codigo }, body: { senha: "senha-segura-123" }, usuario: null });
    assert.equal(reutilizado.statusCode, 410);
    assert.equal(usuarios.filter((item) => item.tipo === "CLIENTE").length, 1);
  });

  it("cria gerente responsável e concede escala somente para a obra do convite", async () => {
    const criado = await chamar("POST", "/convites/gerente", { body: { obraId: "obra-convite-a", nome: "Gerente A", email: "gerente@teste.local", telefone: "11987654321", funcao: "Gerente de obras" } });
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
    assert.equal(notificacoes.length, 2);
  });

  it("exige que o cliente esteja vinculado a uma obra e tenha contrato e parcelas", async () => {
    const dados = { nome: "Cliente A", email: "cliente@teste.local", telefone: "11987654321", endereco: "Rua do Cliente", estado: "SP", cidade: "Santos", bairro: "Centro", numero: "90", apartamento: "1", bloco: "A", semApartamento: false, semBloco: false, quantidadeParcelas: 2, vencimentoInicial: "2026-12-10", contrato: { data: "data:application/pdf;base64,AA==", mimeType: "application/pdf" } };
    const semObra = await chamar("POST", "/convites/cliente", { body: { ...dados, obraId: "" } });
    assert.equal(semObra.statusCode, 400);
    const semContrato = await chamar("POST", "/convites/cliente", { body: { ...dados, obraId: "obra-convite-a", contrato: undefined } });
    assert.equal(semContrato.statusCode, 400);
    assert.equal(convites.length, 0);
  });

  it("nega criação de convite sem sessão administrativa e convite para outra empresa", async () => {
    const body = { obraId: "obra-convite-a", nome: "Cliente", email: "cliente@teste.local", telefone: "11987654321", endereco: "Rua A", estado: "SP", cidade: "Santos", bairro: "Centro", numero: "100", apartamento: "1", bloco: "A", semApartamento: false, semBloco: false, quantidadeParcelas: 2, vencimentoInicial: "2026-12-10", contrato: { data: "data:application/pdf;base64,AA==", mimeType: "application/pdf" } };
    const semSessao = await chamar("POST", "/convites/cliente", { body, usuario: null });
    assert.equal(semSessao.statusCode, 401);
    const obraAlheia = await chamar("POST", "/convites/cliente", { body: { ...body, obraId: "obra-fora-da-empresa" } });
    assert.equal(obraAlheia.statusCode, 404);
    assert.equal(convites.length, 0);
  });
});
