const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const empresaA = "empresa-a";
const empresaB = "empresa-b";
const usuarios = [
  { id: "admin-a", empresaId: empresaA, tipo: "ADMIN", email: "admin-a@teste.local", nome: "Admin A" },
  { id: "admin-b", empresaId: empresaB, tipo: "ADMIN", email: "admin-b@teste.local", nome: "Admin B" },
  { id: "colaborador-a", empresaId: empresaA, tipo: "COLABORADOR", email: "colaborador-a@teste.local", nome: "Colaborador A" },
  { id: "cliente-a", empresaId: empresaA, tipo: "CLIENTE", email: "cliente-a@teste.local", nome: "Cliente A" },
];
const obras = [
  { id: "obra-a", empresaId: empresaA, nome: "Obra A", parcelas: [], eventos: [], escalas: [] },
  { id: "obra-b", empresaId: empresaB, nome: "Obra B", parcelas: [], eventos: [], escalas: [] },
];
const funcionarios = [
  { id: "func-resp-a", empresaId: empresaA, nome: "Responsável A", funcao: "Mestre", nivel: "RESPONSAVEL", ativo: true, usuarioId: "colaborador-a", usuario: { empresaId: empresaA, tipo: "COLABORADOR" } },
  { id: "func-apoio-a", empresaId: empresaA, nome: "Apoio A", funcao: "Apoio", nivel: "APOIO", ativo: true, usuarioId: null, usuario: null },
  { id: "func-resp-b", empresaId: empresaB, nome: "Responsável B", funcao: "Mestre", nivel: "RESPONSAVEL", ativo: true, usuarioId: null, usuario: null },
  { id: "func-login-invalido", empresaId: empresaA, nome: "Vínculo inválido", funcao: "Mestre", nivel: "RESPONSAVEL", ativo: true, usuarioId: "admin-b", usuario: { empresaId: empresaB, tipo: "ADMIN" } },
];
let escalas = [];
let proximoId = 1;

function encontrar(list, where) {
  return list.find((item) => Object.entries(where).every(([chave, valor]) => {
    if (chave === "obra") return encontrar(obras, valor) !== undefined;
    if (chave === "funcionario") return encontrar(funcionarios, valor) !== undefined;
    return item[chave] === valor;
  }));
}

function prismaMock() {
  const tx = {
    obra: {
      findFirst: async ({ where }) => encontrar(obras, where) || null,
      findMany: async ({ where }) => {
        let resultados = obras.filter((obra) => !where.empresaId || obra.empresaId === where.empresaId);
        if (where.escalas?.some) {
          const requisito = where.escalas.some;
          resultados = resultados.filter((obra) => escalas.some((escala) => escala.obraId === obra.id && escala.dataFim === requisito.dataFim && encontrar(funcionarios, requisito.funcionario)));
        }
        return resultados.map((obra) => ({ ...obra, escalas: escalas.filter((escala) => escala.obraId === obra.id && escala.dataFim === null).map((escala) => ({ ...escala, funcionario: encontrar(funcionarios, { id: escala.funcionarioId }) })) }));
      },
    },
    funcionario: { findFirst: async ({ where }) => encontrar(funcionarios, where) || null },
    obraEscala: {
      findFirst: async ({ where }) => encontrar(escalas, where) || null,
      findMany: async ({ where }) => escalas.filter((escala) => escala.obraId === where.obraId && encontrar(obras, { id: escala.obraId, empresaId: where.obra.empresaId }) && encontrar(funcionarios, where.funcionario)),
      create: async ({ data }) => {
        const escala = { id: `escala-${proximoId++}`, ...data, dataFim: null, motivo: null };
        escalas.push(escala);
        return { ...escala, funcionario: encontrar(funcionarios, { id: escala.funcionarioId }), alteradoPor: encontrar(usuarios, { id: escala.alteradoPorId }) };
      },
      updateMany: async ({ where, data }) => {
        const escala = encontrar(escalas, where);
        if (!escala) return { count: 0 };
        Object.assign(escala, data);
        return { count: 1 };
      },
      findUnique: async ({ where }) => {
        const escala = encontrar(escalas, where);
        return escala ? { ...escala, funcionario: encontrar(funcionarios, { id: escala.funcionarioId }), alteradoPor: encontrar(usuarios, { id: escala.alteradoPorId }) } : null;
      },
    },
  };
  return { ...tx, $transaction: (callback) => callback(tx) };
}

const dbPath = require.resolve("../src/config/db");
const userRepositoryPath = require.resolve("../src/repositories/usuarioRepository");
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { getPrisma: prismaMock, isDbConfigured: () => true } };
require.cache[userRepositoryPath] = {
  id: userRepositoryPath,
  filename: userRepositoryPath,
  loaded: true,
  exports: {
    buscarPerfilUsuarioPorId: async (id) => {
      const { senhaHash, ...perfil } = encontrar(usuarios, { id }) || {};
      return perfil.id ? perfil : null;
    },
    buscarFuncionarioPorUsuarioId: async (usuarioId) => encontrar(funcionarios, { usuarioId }) || null,
    listarUsuarios: async () => [],
    buscarUsuarioPorEmail: async () => null,
    buscarUsuarioPorId: async () => null,
    atualizarSenhaUsuario: async () => null,
    criarUsuarioColaborador: async () => null,
  },
};

process.env.JWT_SECRET = "segredo-de-teste-alocacao";
const app = require("../index");

function tokenPara(usuarioId) {
  const usuario = encontrar(usuarios, { id: usuarioId });
  return jwt.sign({ id: usuario.id, email: usuario.email, tipo: usuario.tipo, empresaId: usuario.empresaId }, process.env.JWT_SECRET);
}

async function requisitar(caminho, usuarioId, opcoes = {}) {
  const metodo = (opcoes.method || "GET").toLowerCase();
  const segmentos = caminho.split("/").filter(Boolean);
  const camada = app.router.stack.find((item) => {
    if (!item.route?.methods[metodo]) return false;
    const padrao = item.route.path.split("/").filter(Boolean);
    return padrao.length === segmentos.length && padrao.every((parte, indice) => parte.startsWith(":") || parte === segmentos[indice]);
  });
  assert.ok(camada, `Rota ${opcoes.method || "GET"} ${caminho} deve existir`);

  const nomesParametros = camada.route.path.split("/").filter(Boolean);
  const params = Object.fromEntries(nomesParametros.flatMap((nome, indice) => nome.startsWith(":") ? [[nome.slice(1), segmentos[indice]]] : []));
  const req = {
    headers: {
      ...(usuarioId ? { authorization: `Bearer ${tokenPara(usuarioId)}` } : {}),
      ...(opcoes.headers || {}),
    },
    params,
    body: opcoes.body ? JSON.parse(opcoes.body) : {},
  };
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

  return { status: res.statusCode, json: async () => res.body };
}

describe("Issue #20 — alocação de colaboradores em obras", () => {
  it("admin aloca responsável da própria empresa e rejeita duplicidade", async () => {
    const primeira = await requisitar("/obras/obra-a/colaboradores", "admin-a", {
      method: "POST", body: JSON.stringify({ funcionarioId: "func-resp-a" }),
    });
    assert.equal(primeira.status, 201);
    const corpo = await primeira.json();
    assert.equal(corpo.alocacao.alteradoPorId, "admin-a");
    assert.ok(corpo.alocacao.dataInicio);

    const duplicada = await requisitar("/obras/obra-a/colaboradores", "admin-a", {
      method: "POST", body: JSON.stringify({ funcionarioId: "func-resp-a" }),
    });
    assert.equal(duplicada.status, 409);
  });

  it("exige autenticação e papel ADMIN", async () => {
    const semSessao = await requisitar("/obras/obra-a/colaboradores", null, { method: "POST" });
    assert.equal(semSessao.status, 401);
    const cliente = await requisitar("/obras/obra-a/colaboradores", "cliente-a", {
      method: "POST", body: JSON.stringify({ funcionarioId: "func-resp-a" }),
    });
    assert.equal(cliente.status, 403);
  });

  it("rejeita funcionário de outra empresa, nível diferente e vínculo de usuário inconsistente", async () => {
    for (const funcionarioId of ["func-resp-b", "func-apoio-a", "func-login-invalido"]) {
      const resposta = await requisitar("/obras/obra-a/colaboradores", "admin-a", {
        method: "POST", body: JSON.stringify({ funcionarioId }),
      });
      assert.ok([400, 404, 409].includes(resposta.status), `${funcionarioId}: ${resposta.status}`);
    }
  });

  it("encerra escala sem apagar histórico e impede encerramento repetido", async () => {
    const escalaId = escalas[0].id;
    const encerrada = await requisitar(`/obras/obra-a/colaboradores/${escalaId}`, "admin-a", {
      method: "PATCH", body: JSON.stringify({ motivo: "Alocação concluída" }),
    });
    assert.equal(encerrada.status, 200);
    const corpo = await encerrada.json();
    assert.equal(corpo.alocacao.motivo, "Alocação concluída");
    assert.ok(corpo.alocacao.dataFim);
    assert.equal(escalas.length, 1);

    const repetida = await requisitar(`/obras/obra-a/colaboradores/${escalaId}`, "admin-a", { method: "PATCH", body: JSON.stringify({}) });
    assert.equal(repetida.status, 409);
  });

  it("lista alocações abertas e histórico isolados por empresa", async () => {
    const resposta = await requisitar("/obras/obra-a/colaboradores", "admin-a");
    assert.equal(resposta.status, 200);
    const corpo = await resposta.json();
    assert.equal(corpo.alocacoesAbertas.length, 0);
    assert.equal(corpo.historico.length, 1);

    const outraEmpresa = await requisitar("/obras/obra-a/colaboradores", "admin-b");
    assert.equal(outraEmpresa.status, 404);
    const tentativaEncerrar = await requisitar(`/obras/obra-a/colaboradores/${escalas[0].id}`, "admin-b", { method: "PATCH", body: JSON.stringify({}) });
    assert.equal(tentativaEncerrar.status, 404);
  });

  it("mantém o escopo existente: colaborador só lista obra com alocação aberta", async () => {
    const aberta = await requisitar("/obras/obra-a/colaboradores", "admin-a", {
      method: "POST", body: JSON.stringify({ funcionarioId: "func-resp-a" }),
    });
    assert.equal(aberta.status, 201);
    const resposta = await requisitar("/obras", "colaborador-a");
    assert.equal(resposta.status, 200);
    const obrasVisiveis = await resposta.json();
    assert.deepEqual(obrasVisiveis.map((obra) => obra.id), ["obra-a"]);
  });
});
