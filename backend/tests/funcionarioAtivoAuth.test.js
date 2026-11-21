const { describe, it, before, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const empresaA = "empresa-auth-a";
const empresaB = "empresa-auth-b";
const usuarios = [
  { id: "colab-ativo", nome: "Colaborador Ativo", email: "ativo@teste.local", senhaHash: "", tipo: "COLABORADOR", empresaId: empresaA },
  { id: "colab-inativo", nome: "Colaborador Inativo", email: "inativo@teste.local", senhaHash: "", tipo: "COLABORADOR", empresaId: empresaA },
  { id: "colab-sem-funcionario", nome: "Sem Funcionário", email: "sem-funcionario@teste.local", senhaHash: "", tipo: "COLABORADOR", empresaId: empresaA },
  { id: "colab-empresa-divergente", nome: "Empresa Divergente", email: "divergente@teste.local", senhaHash: "", tipo: "COLABORADOR", empresaId: empresaA },
  { id: "cliente-auth", nome: "Cliente", email: "cliente@teste.local", senhaHash: "", tipo: "CLIENTE", empresaId: empresaA },
  { id: "admin-auth", nome: "Admin", email: "admin@teste.local", senhaHash: "", tipo: "ADMIN", empresaId: empresaA },
];
const funcionarios = [
  { id: "func-ativo", usuarioId: "colab-ativo", empresaId: empresaA, ativo: true },
  { id: "func-inativo", usuarioId: "colab-inativo", empresaId: empresaA, ativo: true },
  { id: "func-divergente", usuarioId: "colab-empresa-divergente", empresaId: empresaB, ativo: true },
];
const obras = [{ id: "obra-auth", empresaId: empresaA }];
const escalas = [{ id: "escala-aberta", obraId: "obra-auth", funcionarioId: "func-inativo", dataFim: null }];
let dbDisponivel = true;
let erroConsultaFuncionario = false;
let eventos = [];
let senhaHash;

function localizar(lista, where) {
  return lista.find((item) => Object.entries(where).every(([chave, valor]) => item[chave] === valor)) || null;
}

function selecionar(registro, select) {
  if (!registro || !select) return registro;
  const resultado = Object.fromEntries(Object.keys(select).filter((campo) => select[campo] === true).map((campo) => [campo, registro[campo]]));
  if (select.funcionario?.select) {
    const funcionario = funcionarios.find((item) => item.usuarioId === registro.id);
    resultado.funcionario = funcionario ? selecionar(funcionario, select.funcionario.select) : null;
  }
  return resultado;
}

const prismaFalso = {
  usuario: {
    findUnique: async ({ where, select }) => {
      if (erroConsultaFuncionario && select?.funcionario) {
        const erro = new Error("Banco temporariamente indisponível");
        erro.name = "PrismaClientInitializationError";
        throw erro;
      }
      const usuario = localizar(usuarios, where);
      return selecionar(usuario, select);
    },
  },
  funcionario: {
    findUnique: async ({ where, select }) => {
      if (erroConsultaFuncionario) {
        const erro = new Error("Banco temporariamente indisponível");
        erro.name = "PrismaClientInitializationError";
        throw erro;
      }
      return selecionar(localizar(funcionarios, where), select);
    },
    findFirst: async ({ where }) => localizar(funcionarios, where),
  },
  obra: {
    findFirst: async ({ where }) => localizar(obras, where),
    findMany: async () => [],
  },
  obraEscala: { findFirst: async ({ where }) => localizar(escalas, where) },
  obraEvento: {
    create: async ({ data }) => {
      const evento = { id: `evento-${eventos.length + 1}`, ...data };
      eventos.push(evento);
      return evento;
    },
  },
  $transaction: (callback) => callback(prismaFalso),
};

const dbPath = require.resolve("../src/config/db");
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getPrisma: () => prismaFalso, isDbConfigured: () => dbDisponivel },
};

process.env.JWT_SECRET = "segredo-testes-funcionario-ativo";
const app = require("../index");
const authMiddleware = require("../src/middlewares/authMiddleware");
const { registrarAndamento } = require("../src/repositories/obraRepository");

function tokenPara(usuario) {
  return jwt.sign({ id: usuario.id, email: usuario.email, tipo: usuario.tipo, empresaId: usuario.empresaId }, process.env.JWT_SECRET);
}

async function executarRota(metodo, caminho, req) {
  const camada = app.router.stack.find((item) => item.route?.path === caminho && item.route.methods[metodo.toLowerCase()]);
  assert.ok(camada, `Rota ${metodo} ${caminho} deve existir`);
  const handlers = camada.route.stack.map((item) => item.handle);
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

function requisicaoProtegida(usuario, caminho = "/auth/me") {
  return {
    headers: { authorization: `Bearer ${tokenPara(usuario)}` },
    params: caminho === "/obras/:id" ? { id: "obra-auth" } : {},
    body: { descricao: "Tentativa de registro" },
    is: () => false,
  };
}

async function login(usuario) {
  return executarRota("POST", "/auth/login", {
    body: { email: usuario.email, senha: "senha-correta" },
    headers: {},
  });
}

describe("Bloqueio centralizado de funcionários desativados", () => {
  before(async () => {
    senhaHash = await bcrypt.hash("senha-correta", 4);
    usuarios.forEach((usuario) => { usuario.senhaHash = senhaHash; });
  });

  beforeEach(() => {
    dbDisponivel = true;
    erroConsultaFuncionario = false;
    eventos = [];
    funcionarios.find((item) => item.usuarioId === "colab-ativo").ativo = true;
    funcionarios.find((item) => item.usuarioId === "colab-inativo").ativo = true;
    usuarios.forEach((usuario) => authMiddleware.invalidarSessaoUsuario(usuario.id));
  });

  it("colaborador ativo autentica e recebe token", async () => {
    const resposta = await login(localizar(usuarios, { id: "colab-ativo" }));
    assert.equal(resposta.statusCode, 200);
    assert.ok(resposta.body.token);
  });

  it("colaborador inativo não recebe token no login", async () => {
    funcionarios.find((item) => item.usuarioId === "colab-inativo").ativo = false;
    const resposta = await login(localizar(usuarios, { id: "colab-inativo" }));
    assert.equal(resposta.statusCode, 401);
    assert.equal(resposta.body.token, undefined);
    assert.equal(resposta.body.erro, "Credenciais inválidas");
  });

  it("token emitido antes da desativação é bloqueado em auth/me e obras", async () => {
    const colaborador = localizar(usuarios, { id: "colab-ativo" });
    const tokenAntigo = tokenPara(colaborador);
    funcionarios.find((item) => item.usuarioId === colaborador.id).ativo = false;
    const req = { headers: { authorization: `Bearer ${tokenAntigo}` }, params: {}, body: {}, is: () => false };

    const perfil = await executarRota("GET", "/auth/me", req);
    assert.equal(perfil.statusCode, 403);
    const obrasDaConta = await executarRota("GET", "/obras", req);
    assert.equal(obrasDaConta.statusCode, 403);
  });

  it("nega colaborador sem funcionário e vínculo ligado a outra empresa", async () => {
    for (const id of ["colab-sem-funcionario", "colab-empresa-divergente"]) {
      const usuario = localizar(usuarios, { id });
      const credenciais = await login(usuario);
      assert.equal(credenciais.statusCode, 401);
      const recurso = await executarRota("GET", "/auth/me", requisicaoProtegida(usuario));
      assert.equal(recurso.statusCode, 403);
    }
  });

  it("funcionário inativo não registra andamento mesmo com escala aberta", async () => {
    const funcionario = funcionarios.find((item) => item.usuarioId === "colab-inativo");
    funcionario.ativo = false;
    const usuario = localizar(usuarios, { id: "colab-inativo" });
    const rota = await executarRota("POST", "/obras/:id/andamento", requisicaoProtegida(usuario));
    assert.equal(rota.statusCode, 403);

    await assert.rejects(registrarAndamento({
      obraId: "obra-auth",
      empresaId: empresaA,
      usuarioId: usuario.id,
      tipo: "ANOTACAO",
      descricao: "Não deve persistir",
    }), { code: "COLABORADOR_SEM_VINCULO" });
    assert.equal(eventos.length, 0);
  });

  it("clientes e administradores continuam autenticando e usando rota protegida", async () => {
    for (const id of ["cliente-auth", "admin-auth"]) {
      const usuario = localizar(usuarios, { id });
      const credenciais = await login(usuario);
      assert.equal(credenciais.statusCode, 200);
      const recurso = await executarRota("GET", "/auth/me", requisicaoProtegida(usuario));
      assert.equal(recurso.statusCode, 200);
    }
  });

  it("indisponibilidade do banco retorna 503 e não é tratada como inatividade", async () => {
    erroConsultaFuncionario = true;
    const colaborador = localizar(usuarios, { id: "colab-ativo" });
    const credenciais = await login(colaborador);
    assert.equal(credenciais.statusCode, 503);
    assert.notEqual(credenciais.body.erro, "Credenciais inválidas");

    const recurso = await executarRota("GET", "/auth/me", requisicaoProtegida(colaborador));
    assert.equal(recurso.statusCode, 503);
    assert.match(recurso.body.erro, /validar a sessão/i);

    erroConsultaFuncionario = false;
    dbDisponivel = false;
    const loginSemBanco = await login(colaborador);
    assert.equal(loginSemBanco.statusCode, 503);
    const sessaoSemBanco = await executarRota("GET", "/auth/me", requisicaoProtegida(colaborador));
    assert.equal(sessaoSemBanco.statusCode, 503);
  });

  it("rotas de usuário usam authMiddleware e webhook tem proteção própria", () => {
    const publicas = new Set(["/", "/health", "/auth/login", "/auth/registro-empreiteira", "/convites/:token", "/convites/:token/aceitar"]);
    const webhookProtegidoPorAssinatura = "/webhooks/mercado-pago";
    const privadas = app.router.stack.filter((item) => item.route && !publicas.has(item.route.path) && item.route.path !== webhookProtegidoPorAssinatura);
    assert.ok(privadas.length > 0);
    assert.ok(privadas.every((item) => item.route.stack[0].handle === authMiddleware));

    // O provedor não possui sessão JWT; o webhook tem sua própria validação
    // criptográfica e consulta o pagamento diretamente na API oficial.
    const webhook = app.router.stack.find((item) => item.route?.path === webhookProtegidoPorAssinatura);
    assert.ok(webhook);
    assert.notEqual(webhook.route.stack[0].handle, authMiddleware);
  });
});

process.on("exit", () => { delete require.cache[dbPath]; });
