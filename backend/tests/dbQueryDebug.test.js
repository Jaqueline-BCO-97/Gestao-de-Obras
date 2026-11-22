const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("diagnóstico SQL por requisição", () => {
  it("associa eventos do Prisma à rota ativa e conta só instruções de dados", async () => {
    const clientPath = require.resolve("@prisma/client");
    const dbPath = require.resolve("../src/config/db");
    const clientAnterior = require.cache[clientPath];
    const dbAnterior = require.cache[dbPath];
    const databaseUrlAnterior = process.env.DATABASE_URL;
    const debugAnterior = process.env.DEBUG_QUERIES;
    const logs = [];
    let cliente;

    class PrismaClientFalso {
      constructor() {
        cliente = this;
        this.handlers = new Map();
      }
      $on(evento, handler) { this.handlers.set(evento, handler); }
      emitirQuery(query) { this.handlers.get("query")?.({ query }); }
    }

    require.cache[clientPath] = { id: clientPath, filename: clientPath, loaded: true, exports: { PrismaClient: PrismaClientFalso } };
    delete require.cache[dbPath];
    process.env.DATABASE_URL = "fake-database";
    process.env.DEBUG_QUERIES = "1";
    const logOriginal = console.log;
    console.log = (...args) => logs.push(args.join(" "));

    try {
      const db = require("../src/config/db");
      db.getPrisma();
      const contextoObras = db.iniciarRequisicaoDb("GET /obras");
      cliente.emitirQuery("BEGIN");
      cliente.emitirQuery("DEALLOCATE ALL");
      cliente.emitirQuery(`SELECT ${"coluna, ".repeat(20)}coluna_final FROM "Obra"`);
      cliente.emitirQuery("COMMIT");
      const consultasObras = db.getQueryCount(contextoObras);
      db.finalizarRequisicaoDb(contextoObras);

      const contextoNotif = db.iniciarRequisicaoDb("GET /notificacoes");
      const consultasNotif = db.getQueryCount(contextoNotif);
      db.finalizarRequisicaoDb(contextoNotif);

      assert.equal(contextoObras.rota, "GET /obras");
      assert.equal(consultasObras, 1);
      assert.equal(consultasNotif, 0);
      assert.equal(logs.length, 4);
      const prefixo = "[SQL][GET /obras] ";
      assert.deepEqual(logs.map((linha) => linha.replace(prefixo, "")), [
        "BEGIN",
        "DEALLOCATE ALL",
        `SELECT ${"coluna, ".repeat(20)}coluna_final FROM "Obra"`.slice(0, 80),
        "COMMIT",
      ]);
      assert.equal(logs[2].slice(prefixo.length).length, 80);
    } finally {
      console.log = logOriginal;
      if (databaseUrlAnterior === undefined) delete process.env.DATABASE_URL;
    process.env.DATABASE_URL = "fake-database";
      if (debugAnterior === undefined) delete process.env.DEBUG_QUERIES;
      else process.env.DEBUG_QUERIES = debugAnterior;
      if (clientAnterior) require.cache[clientPath] = clientAnterior;
      else delete require.cache[clientPath];
      if (dbAnterior) require.cache[dbPath] = dbAnterior;
      else delete require.cache[dbPath];
    }
  });
});
