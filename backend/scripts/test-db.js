// Teste rápido de conexão com o banco (Prisma + PostgreSQL do Supabase).
// Uso: cd backend && npm run test-connection (precisa do .env com DATABASE_URL)
require("dotenv").config();
const { getPrisma, isDbConfigured } = require("../src/config/db");

async function main() {
  if (!isDbConfigured()) {
    console.log(
      "Banco não configurado. Copie .env.example para .env e preencha DATABASE_URL com a connection string do Supabase."
    );
    process.exit(0);
  }

  const prisma = getPrisma();
  try {
    const total = await prisma.usuario.count();
    console.log(`OK! Conectado ao banco. ${total} usuário(s) na tabela Usuario.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erro) => {
  console.error("Erro ao conectar no banco:", erro.message);
  process.exit(1);
});
