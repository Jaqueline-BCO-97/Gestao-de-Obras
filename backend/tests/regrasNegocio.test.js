const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

let estado;
const dbPath = require.resolve("../src/config/db");

const prisma = {
  obra: {
    findFirst: async ({ where }) => estado.obra && estado.obra.id === where.id && estado.obra.empresaId === where.empresaId && (where.excluidaEm !== null || estado.obra.excluidaEm === null) ? { ...estado.obra } : null,
    update: async ({ data }) => Object.assign(estado.obra, data),
  },
  parcela: { findMany: async () => estado.parcelas },
  convite: { findFirst: async () => estado.convitePendente ? { id: "convite-pendente" } : null },
  pagamento: { findFirst: async () => null },
  obraEvento: { create: async ({ data }) => ({ id: "evento-arquivo", ...data }) },
  usuario: { findMany: async () => [] },
  notificacao: { createMany: async () => ({ count: 0 }) },
  $transaction: (callback) => callback(prisma),
};

require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getPrisma: () => prisma, isDbConfigured: () => true },
};

const { arquivarObra, confirmarPrimeiraParcela, iniciarExecucaoObra } = require("../src/repositories/obraRepository");

function preparar({ status = "AGENDADA", situacao = "PENDENTE", pagamento = null, convitePendente = false } = {}) {
  estado = {
    obra: { id: "obra-demo", empresaId: "empresa-demo", status, excluidaEm: null },
    parcelas: [{ id: "parcela-1", numero: 1, situacao, pagamentos: pagamento ? [{ id: "pagamento-1", status: pagamento }] : [] }],
    convitePendente,
  };
}

describe("regras de arquivamento e convite de cliente", () => {
  beforeEach(() => preparar());

  it("arquiva somente obra agendada sem parcela paga ou pagamento em processamento", async () => {
    const resultado = await arquivarObra({ obraId: "obra-demo", empresaId: "empresa-demo", administradorId: "admin-demo", motivo: "Cancelamento solicitado pelo cliente" });
    assert.ok(resultado.excluidaEm instanceof Date);
    assert.ok(resultado.exclusaoExpiraEm instanceof Date);
  });

  it("não arquiva obra em execução, aguardando conferência ou concluída", async () => {
    for (const status of ["EM_ANDAMENTO", "AGUARDANDO_CONFERENCIA", "CONCLUIDA"]) {
      preparar({ status });
      await assert.rejects(arquivarObra({ obraId: "obra-demo", empresaId: "empresa-demo", administradorId: "admin-demo", motivo: "Cancelamento solicitado pelo cliente" }), { code: status === "EM_ANDAMENTO" ? "OBRA_EM_EXECUCAO" : "OBRA_NAO_AGENDADA" });
    }
  });

  it("bloqueia arquivamento com parcela paga ou pagamento pendente", async () => {
    preparar({ situacao: "PAGA" });
    await assert.rejects(arquivarObra({ obraId: "obra-demo", empresaId: "empresa-demo", administradorId: "admin-demo", motivo: "Cancelamento solicitado pelo cliente" }), { code: "PAGAMENTO_RECEBIDO" });
    preparar({ pagamento: "PENDENTE" });
    await assert.rejects(arquivarObra({ obraId: "obra-demo", empresaId: "empresa-demo", administradorId: "admin-demo", motivo: "Cancelamento solicitado pelo cliente" }), { code: "PAGAMENTO_RECEBIDO" });
  });

  it("bloqueia confirmar a primeira parcela enquanto o convite do cliente está pendente", async () => {
    preparar({ convitePendente: true });
    await assert.rejects(confirmarPrimeiraParcela({ obraId: "obra-demo", empresaId: "empresa-demo", administradorId: "admin-demo" }), { code: "CONVITE_CLIENTE_PENDENTE" });
  });

  it("bloqueia iniciar execução enquanto o convite do cliente está pendente", async () => {
    preparar({ convitePendente: true });
    await assert.rejects(iniciarExecucaoObra({ obraId: "obra-demo", empresaId: "empresa-demo", administradorId: "admin-demo" }), { code: "CONVITE_CLIENTE_PENDENTE" });
  });
});

process.on("exit", () => delete require.cache[dbPath]);
