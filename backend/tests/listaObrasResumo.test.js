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
  it("seleciona relações e campos mínimos e mantém apenas os usados na lista do admin", async () => {
    await listarObras("empresa-1", "admin-1", "ADMIN");
    const select = chamadas.lista.select;

    assert.equal(select.eventos.take, 10);
    assert.deepEqual(select.eventos.orderBy, { criadoEm: "desc" });
    assert.equal(select.parcelas.take, 2);
    assert.deepEqual(select.parcelas.where, { numero: { lte: 2 } });
    assert.deepEqual(select.parcelas.select.pagamentos.where.status.in, ["APROVADO", "PENDENTE"]);
    assert.ok(select.convites);
    assert.equal(select.contrato, undefined);
    assert.equal(select.disponibilidades, undefined);
    assert.equal(select.informacoesAdicionais, true);
    assert.equal(select.eventos.select.usuario.select.nome, true);
  });

  it("carrega contrato na lista do cliente e histórico integral no detalhe", async () => {
    await listarObras("empresa-1", "cliente-1", "CLIENTE");
    assert.ok(chamadas.lista.select.contrato);
    assert.equal(chamadas.lista.select.convites, undefined);

    await buscarObraPorId("obra-1", "empresa-1", "cliente-1", "CLIENTE");
    assert.equal(chamadas.detalhe.include.eventos.take, undefined);
    assert.equal(chamadas.detalhe.include.disponibilidades !== undefined, true);
  });
});
