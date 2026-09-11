// Cliente Prisma (singleton preguiçoso).
// A conexão é o PostgreSQL do Supabase via DATABASE_URL (ver backend/.env.example).
// Se DATABASE_URL não estiver definida, getPrisma() retorna null para o app
// subir mesmo assim (rotas de banco respondem 503 explicativo).
require("dotenv").config();

let prisma = null;

function getPrisma() {
  if (prisma) return prisma;
  if (!process.env.DATABASE_URL) return null;

  const { PrismaClient } = require("@prisma/client");
  prisma = new PrismaClient();
  return prisma;
}

function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

module.exports = { getPrisma, isDbConfigured };
