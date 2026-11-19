const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const caminhoDb = require.resolve("../src/config/db");
const chamadas = {};
const prismaFalso = {
  obra: {
    findMany: async (args) => { chamadas.lista = args; return []; },
    findFirst: async (args) => { chamadas.detalhe = args; return null; },
  },
};

require.cache[caminhoDb] = {
  id: caminhoDb,
  filename: caminhoDb,
  loaded: true,
  exports: { getPrisma: () => prismaFalso, isDbConfigured: () => true },
};
const { listarObras, buscarObraPorId } = require("../src/repositories/obraRepository");

describe("resumo de obras nos painéis", () => {
  it("limita relações pesadas e mantém apenas relações usadas na lista do admin", async () => {
    await listarObras("empresa-1", "admin-1", "ADMIN");
    const include = chamadas.lista.include;

    assert.equal(include.eventos.take, 10);
    assert.deepEqual(include.eventos.orderBy, { criadoEm: "desc" });
    assert.equal(include.parcelas.take, 2);
    assert.deepEqual(include.parcelas.where, { numero: { lte: 2 } });
    assert.deepEqual(include.parcelas.include.pagamentos.where.status.in, ["APROVADO", "PENDENTE"]);
    assert.ok(include.convites);
    assert.equal(include.contrato, undefined);
    assert.equal(include.disponibilidades, undefined);
  });

  it("carrega contrato na lista do cliente e histórico integral no detalhe", async () => {
    await listarObras("empresa-1", "cliente-1", "CLIENTE");
    assert.ok(chamadas.lista.include.contrato);
    assert.equal(chamadas.lista.include.convites, undefined);

    await buscarObraPorId("obra-1", "empresa-1", "cliente-1", "CLIENTE");
    assert.equal(chamadas.detalhe.include.eventos.take, undefined);
    assert.equal(chamadas.detalhe.include.disponibilidades !== undefined, true);
  });
});
