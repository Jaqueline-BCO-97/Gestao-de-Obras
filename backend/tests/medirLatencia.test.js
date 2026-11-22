const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { medir, mediana } = require("../scripts/medir-latencia");

describe("medir-latencia", () => {
  it("faz as três requisições e registra primeira chamada e mediana", async () => {
    const fetchOriginal = global.fetch;
    let chamadas = 0;
    global.fetch = async () => {
      chamadas += 1;
      return {
        ok: true,
        status: 200,
        headers: { get: () => String(chamadas) },
        json: async () => ({ chamada: chamadas }),
      };
    };

    try {
      const linhas = [];
      const primeira = await medir(linhas, "rota teste", "/teste", "token");
      assert.equal(chamadas, 3);
      assert.deepEqual(primeira.conteudo, { chamada: 1 });
      assert.equal(linhas.length, 4);
      assert.deepEqual(linhas.slice(0, 3).map((linha) => linha[2]), ["1", "2", "3"]);
      assert.equal(linhas[3][1], "1ª / med");
      assert.equal(linhas[3][2], "1 / 2");
    } finally {
      global.fetch = fetchOriginal;
    }
  });

  it("calcula a mediana de durações", () => {
    assert.equal(mediana([9, 2, 5]), 5);
  });
});
