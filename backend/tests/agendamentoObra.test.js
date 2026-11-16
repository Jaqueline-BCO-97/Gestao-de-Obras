const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const empresaA = "empresa-agenda-a";
const empresaB = "empresa-agenda-b";
const perfis = [
  { id: "admin-a", email: "admin-a@teste.local", nome: "Admin A", tipo: "ADMIN", empresaId: empresaA },
  { id: "admin-b", email: "admin-b@teste.local", nome: "Admin B", tipo: "ADMIN", empresaId: empresaB },
  { id: "cliente-a", email: "cliente-a@teste.local", nome: "Cliente A", tipo: "CLIENTE", empresaId: empresaA },
  { id: "colab-ativo", email: "colab@teste.local", nome: "Colaborador", tipo: "COLABORADOR", empresaId: empresaA },
  { id: "colab-inativo", email: "inativo@teste.local", nome: "Inativo", tipo: "COLABORADOR", empresaId: empresaA },
];
const funcionarios = [
  { id: "func-ativo", usuarioId: "colab-ativo", empresaId: empresaA, ativo: true },
  { id: "func-inativo", usuarioId: "colab-inativo", empresaId: empresaA, ativo: false },
];
let estado;
let falharCriacaoEvento;
let chamadasLock;
const filasLock = new Map();

function compararCampo(valor, filtro) {
  if (filtro && typeof filtro === "object" && !(filtro instanceof Date)) {
    if (Object.hasOwn(filtro, "not") && valor === filtro.not) return false;
    if (Object.hasOwn(filtro, "lt") && !(valor instanceof Date && valor < filtro.lt)) return false;
    if (Object.hasOwn(filtro, "gt") && !(valor instanceof Date && valor > filtro.gt)) return false;
    if (Object.hasOwn(filtro, "not") && filtro.not === null && valor === null) return false;
    return true;
  }
  return valor === filtro;
}

function corresponde(obra, where) {
  return Object.entries(where).every(([campo, filtro]) => {
    if (campo === "AND") return filtro.every((condicao) => corresponde(obra, condicao));
    return compararCampo(obra[campo], filtro);
  });
}

function obraCompleta(obra) {
  return {
    ...obra,
    cliente: obra.clienteId ? perfis.find((perfil) => perfil.id === obra.clienteId) : null,
    parcelas: [],
    escalas: [],
    eventos: estado.eventos
      .filter((evento) => evento.obraId === obra.id)
      .map((evento) => ({ ...evento, usuario: { nome: perfis.find((perfil) => perfil.id === evento.usuarioId)?.nome || "" } })),
  };
}

function criarPrismaFalso() {
  const tx = {
    obra: {
      findFirst: async ({ where }) => {
        const obra = estado.obras.find((item) => corresponde(item, where));
        if (!obra) return null;
        if (where.select) {
          return Object.fromEntries(Object.keys(where.select).map((campo) => [campo, obra[campo]]));
        }
        return obraCompleta(obra);
      },
      update: async ({ where, data }) => {
        const obra = estado.obras.find((item) => item.id === where.id);
        if (!obra) throw Object.assign(new Error("Obra ausente"), { code: "P2025" });
        Object.assign(obra, data);
        return obra;
      },
    },
    obraEvento: {
      create: async ({ data }) => {
        if (falharCriacaoEvento) throw new Error("Falha simulada ao gravar evento");
        const evento = { id: `evento-${estado.eventos.length + 1}`, criadoEm: new Date(), ...data };
        estado.eventos.push(evento);
        return evento;
      },
    },
  };

  return {
    ...tx,
    $transaction: async (callback) => {
      let liberarLock;
      let snapshot;
      const contexto = {
        ...tx,
        $queryRaw: async (_consulta, empresaId) => {
          chamadasLock.push(empresaId);
          const anterior = filasLock.get(empresaId) || Promise.resolve();
          let liberar;
          const atual = new Promise((resolve) => { liberar = resolve; });
          const fila = anterior.then(() => atual);
          filasLock.set(empresaId, fila);
          await anterior;
          liberarLock = () => {
            liberar();
            if (filasLock.get(empresaId) === fila) filasLock.delete(empresaId);
          };
          // Snapshot após adquirir o mutex simulado, para modelar rollback sem
          // desfazer alterações confirmadas por outra transação concorrente.
          snapshot = structuredClone(estado);
          return [];
        },
      };
      try {
        return await callback(contexto);
      } catch (erro) {
        if (snapshot) estado = snapshot;
        throw erro;
      } finally {
        liberarLock?.();
      }
    },
  };
}

const dbPath = require.resolve("../src/config/db");
const usuarioRepositoryPath = require.resolve("../src/repositories/usuarioRepository");
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getPrisma: criarPrismaFalso, isDbConfigured: () => true },
};
require.cache[usuarioRepositoryPath] = {
  id: usuarioRepositoryPath,
  filename: usuarioRepositoryPath,
  loaded: true,
  exports: {
    buscarPerfilUsuarioPorId: async (id) => perfis.find((perfil) => perfil.id === id) || null,
    buscarFuncionarioPorUsuarioId: async (usuarioId) => funcionarios.find((funcionario) => funcionario.usuarioId === usuarioId) || null,
    listarUsuarios: async () => [],
    buscarUsuarioPorEmail: async () => null,
    buscarUsuarioPorId: async () => null,
    atualizarSenhaUsuario: async () => null,
    criarUsuarioColaborador: async () => null,
  },
};

process.env.JWT_SECRET = "segredo-teste-agendamento";
const jwtSecret = process.env.JWT_SECRET;
const app = require("../index");

function tokenDo(usuarioId) {
  const usuario = perfis.find((perfil) => perfil.id === usuarioId);
  return jwt.sign({ id: usuario.id, email: usuario.email, tipo: usuario.tipo, empresaId: usuario.empresaId }, jwtSecret);
}

async function chamarReagendamento({ usuarioId = "admin-a", obraId = "obra-a", body, semToken = false } = {}) {
  const rota = app.router.stack.find((item) => item.route?.path === "/obras/:id/agendamento" && item.route.methods.patch);
  assert.ok(rota, "A rota PATCH /obras/:id/agendamento deve existir");
  const req = {
    headers: semToken ? {} : { authorization: `Bearer ${tokenDo(usuarioId)}` },
    params: { id: obraId },
    body,
  };
  const res = {
    statusCode: 200,
    body: undefined,
    status(codigo) { this.statusCode = codigo; return this; },
    json(dados) { this.body = dados; return this; },
  };
  const handlers = rota.route.stack.map((item) => item.handle);
  async function executar(indice) {
    if (indice >= handlers.length) return;
    let seguinte;
    await handlers[indice](req, res, () => { seguinte = executar(indice + 1); return seguinte; });
    if (seguinte) await seguinte;
  }
  await executar(0);
  return res;
}

const data = (hora) => new Date(`2026-12-01T${hora}:00.000Z`);
const payload = (inicio = "09:00", fim = "12:00") => ({
  agendadaPara: `2026-12-01T${inicio}:00.000Z`,
  prazoFinal: `2026-12-01T${fim}:00.000Z`,
});

describe("Issue #19 — reagendamento e conflitos entre obras", () => {
  beforeEach(() => {
    estado = {
      obras: [
        { id: "obra-a", empresaId: empresaA, clienteId: "cliente-a", nome: "Obra A", status: "AGENDADA", agendadaPara: null, prazoFinal: null, valorTotal: 1000, endereco: "Rua A" },
        { id: "obra-b", empresaId: empresaA, clienteId: "cliente-a", nome: "Obra B", status: "AGENDADA", agendadaPara: data("13:00"), prazoFinal: data("15:00"), valorTotal: 1200, endereco: "Rua B" },
        { id: "obra-outra-empresa", empresaId: empresaB, clienteId: null, nome: "Obra Externa", status: "AGENDADA", agendadaPara: data("09:30"), prazoFinal: data("11:00"), valorTotal: 500, endereco: "Rua C" },
      ],
      eventos: [],
    };
    falharCriacaoEvento = false;
    chamadasLock = [];
  });

  it("ADMIN agenda uma obra da própria empresa e cria evento visível ao cliente", async () => {
    const resposta = await chamarReagendamento({ body: payload() });
    assert.equal(resposta.statusCode, 200);
    assert.equal(resposta.body.obra.id, "obra-a");
    assert.equal(resposta.body.obra.prazo, "01/12/2026");
    assert.equal(resposta.body.obra.agendadaPara, "2026-12-01T09:00:00.000Z");
    assert.equal(resposta.body.obra.prazoFinal, "2026-12-01T12:00:00.000Z");
    assert.equal(resposta.body.alterada, true);
    assert.equal(resposta.body.evento.tipo, "AGENDAMENTO");
    assert.equal(resposta.body.evento.usuarioId, "admin-a");
    assert.equal(resposta.body.evento.empresaId, empresaA);
    assert.equal(resposta.body.evento.visivelParaCliente, true);
    assert.match(resposta.body.evento.descricao, /09:00 UTC.*12:00 UTC/);
  });

  it("rejeita intervalos com sobreposição, considerando a hora completa", async () => {
    const resposta = await chamarReagendamento({ body: payload("14:30", "16:00") });
    assert.equal(resposta.statusCode, 409);
    assert.match(resposta.body.erro, /conflito de agendamento/i);
    assert.equal(estado.obras[0].agendadaPara, null);
    assert.equal(estado.eventos.length, 0);
  });

  it("não considera obras de outra empresa na busca de conflito", async () => {
    const resposta = await chamarReagendamento({ body: payload("09:30", "10:30") });
    assert.equal(resposta.statusCode, 200);
    assert.equal(estado.eventos.length, 1);
  });

  it("exclui a própria obra da verificação de conflitos", async () => {
    estado.obras[0].agendadaPara = data("09:00");
    estado.obras[0].prazoFinal = data("12:00");
    const resposta = await chamarReagendamento({ body: payload("10:00", "11:00") });
    assert.equal(resposta.statusCode, 200);
  });

  it("obra concluída não bloqueia horário", async () => {
    estado.obras[1].status = "CONCLUIDA";
    const resposta = await chamarReagendamento({ body: payload("14:00", "14:30") });
    assert.equal(resposta.statusCode, 200);
  });

  it("obras sem intervalo completo não reservam horário", async () => {
    estado.obras[1].prazoFinal = null;
    const resposta = await chamarReagendamento({ body: payload("14:00", "14:30") });
    assert.equal(resposta.statusCode, 200);
  });

  it("permite intervalos adjacentes sem sobreposição", async () => {
    estado.obras[1].agendadaPara = data("12:00");
    estado.obras[1].prazoFinal = data("15:00");
    const resposta = await chamarReagendamento({ body: payload("09:00", "12:00") });
    assert.equal(resposta.statusCode, 200);
  });

  it("rejeita datas ausentes, formatos inválidos e datas inexistentes", async () => {
    for (const body of [
      {},
      { agendadaPara: "amanhã", prazoFinal: "2026-12-01T12:00:00.000Z" },
      { agendadaPara: "2026-02-30T09:00:00.000Z", prazoFinal: "2026-12-01T12:00:00.000Z" },
      { agendadaPara: "2026-12-01T09:00:00", prazoFinal: "2026-12-01T12:00:00.000Z" },
    ]) {
      const resposta = await chamarReagendamento({ body });
      assert.equal(resposta.statusCode, 400);
    }
  });

  it("exige prazoFinal estritamente posterior ao início", async () => {
    for (const body of [payload("12:00", "12:00"), payload("13:00", "12:00")]) {
      const resposta = await chamarReagendamento({ body });
      assert.equal(resposta.statusCode, 400);
      assert.match(resposta.body.erro, /posterior/i);
    }
  });

  it("exige autenticação e papel ADMIN", async () => {
    const semToken = await chamarReagendamento({ semToken: true, body: payload() });
    const cliente = await chamarReagendamento({ usuarioId: "cliente-a", body: payload() });
    assert.equal(semToken.statusCode, 401);
    assert.equal(cliente.statusCode, 403);
  });

  it("não permite ao administrador de outra empresa acessar a obra", async () => {
    const resposta = await chamarReagendamento({ usuarioId: "admin-b", body: payload() });
    assert.equal(resposta.statusCode, 404);
    assert.equal(estado.eventos.length, 0);
  });

  it("mantém bloqueado colaborador desativado mesmo com token válido", async () => {
    const resposta = await chamarReagendamento({ usuarioId: "colab-inativo", body: payload() });
    assert.equal(resposta.statusCode, 403);
    assert.equal(estado.eventos.length, 0);
  });

  it("reverte agendamento quando não consegue criar o evento", async () => {
    falharCriacaoEvento = true;
    const resposta = await chamarReagendamento({ body: payload() });
    assert.equal(resposta.statusCode, 500);
    assert.equal(estado.obras[0].agendadaPara, null);
    assert.equal(estado.obras[0].prazoFinal, null);
    assert.equal(estado.eventos.length, 0);
  });

  it("serializa, via lock simulado por empresa, duas tentativas incompatíveis", async () => {
    const resultados = await Promise.all([
      chamarReagendamento({ obraId: "obra-a", body: payload("09:00", "12:00") }),
      chamarReagendamento({ obraId: "obra-b", body: payload("10:00", "13:00") }),
    ]);
    assert.deepEqual(resultados.map((resultado) => resultado.statusCode).sort(), [200, 409]);
    assert.equal(estado.eventos.length, 1);
    assert.equal(chamadasLock.length, 2);
    assert.ok(chamadasLock.every((empresaId) => empresaId === empresaA));
  });

  it("repetir exatamente o mesmo intervalo não cria nova notificação", async () => {
    const primeira = await chamarReagendamento({ body: payload() });
    const repetida = await chamarReagendamento({ body: payload() });
    assert.equal(primeira.body.alterada, true);
    assert.equal(repetida.statusCode, 200);
    assert.equal(repetida.body.alterada, false);
    assert.equal(repetida.body.evento, null);
    assert.equal(estado.eventos.length, 1);
  });

  it("usa apenas estados declarados no schema; StatusObra não define CANCELADA", () => {
    const schema = require("fs").readFileSync(require.resolve("../prisma/schema.prisma"), "utf8");
    const statusObra = schema.match(/enum StatusObra \{([\s\S]*?)\n\}/)?.[1] || "";
    assert.match(statusObra, /CONCLUIDA/);
    assert.doesNotMatch(statusObra, /CANCELAD/);
  });
});

process.on("exit", () => {
  delete require.cache[dbPath];
  delete require.cache[usuarioRepositoryPath];
});
