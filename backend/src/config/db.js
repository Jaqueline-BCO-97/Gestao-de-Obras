// Cliente Prisma (singleton preguiçoso).
// A conexão é o PostgreSQL do Supabase via DATABASE_URL (ver backend/.env.example).
// Se DATABASE_URL não estiver definida, getPrisma() retorna null para o app
// subir mesmo assim (rotas de banco respondem 503 explicativo).
require("dotenv").config();
const { AsyncLocalStorage } = require("node:async_hooks");

let prisma = null;
let queryCount = 0;
const contextoConsulta = new AsyncLocalStorage();
const requisicoesAtivas = new Set();

function iniciarRequisicaoDb(rota) {
  const contexto = { rota, queryCount: 0 };
  requisicoesAtivas.add(contexto);
  return contexto;
}

function finalizarRequisicaoDb(contexto) {
  requisicoesAtivas.delete(contexto);
}

function executarNaRequisicaoDb(contextoOuRota, executar) {
  const criadoAqui = typeof contextoOuRota === "string";
  const contexto = criadoAqui ? iniciarRequisicaoDb(contextoOuRota) : contextoOuRota;
  const finalizarSeCriadoAqui = () => {
    if (criadoAqui) finalizarRequisicaoDb(contexto);
  };
  try {
    const resultado = contextoConsulta.run(contexto, () => executar(contexto));
    if (resultado && typeof resultado.then === "function") {
      return resultado.finally(finalizarSeCriadoAqui);
    }
    finalizarSeCriadoAqui();
    return resultado;
  } catch (erro) {
    finalizarSeCriadoAqui();
    throw erro;
  }
}

function ehConsultaDeDados(sql) {
  return /^(SELECT|WITH|INSERT|UPDATE|DELETE|MERGE|CALL)\b/i.test(String(sql || "").trim());
}

function contextoDaConsulta() {
  const contextoAsync = contextoConsulta.getStore();
  if (contextoAsync) return contextoAsync;
  // O Prisma pode emitir eventos fora do AsyncLocalStorage que iniciou o
  // handler. Quando só há uma requisição ativa, a associação é inequívoca.
  if (requisicoesAtivas.size === 1) return requisicoesAtivas.values().next().value;
  return null;
}

function getPrisma() {
  if (prisma) return prisma;
  if (!process.env.DATABASE_URL) return null;

  const { PrismaClient } = require("@prisma/client");
  prisma = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
  prisma.$on("query", (evento) => {
    const sql = String(evento.query || "").trim();
    const consultaDeDados = ehConsultaDeDados(sql);
    if (consultaDeDados) queryCount += 1;
    const contexto = contextoDaConsulta();
    if (contexto && consultaDeDados) contexto.queryCount += 1;
    if (process.env.DEBUG_QUERIES === "1") {
      const sqlInicial = sql.replace(/\s+/g, " ").slice(0, 80);
      console.log(`[SQL][${contexto?.rota || "sem rota"}] ${sqlInicial}`);
    }
  });
  return prisma;
}

function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getQueryCount(contexto) {
  return contexto?.queryCount ?? contextoConsulta.getStore()?.queryCount ?? queryCount;
}

module.exports = {
  getPrisma,
  isDbConfigured,
  getQueryCount,
  executarNaRequisicaoDb,
  iniciarRequisicaoDb,
  finalizarRequisicaoDb,
};
