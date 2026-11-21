// Cliente Prisma (singleton preguiçoso).
// A conexão é o PostgreSQL do Supabase via DATABASE_URL (ver backend/.env.example).
// Se DATABASE_URL não estiver definida, getPrisma() retorna null para o app
// subir mesmo assim (rotas de banco respondem 503 explicativo).
require("dotenv").config();

let prisma = null;
let queryCount = 0;

function getPrisma() {
  if (prisma) return prisma;
  if (!process.env.DATABASE_URL) return null;

  const { PrismaClient } = require("@prisma/client");
  prisma = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
  prisma.$on("query", () => {
    queryCount += 1;
  });
  return prisma;
}

function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getQueryCount() {
  return queryCount;
}

module.exports = { getPrisma, isDbConfigured, getQueryCount };
