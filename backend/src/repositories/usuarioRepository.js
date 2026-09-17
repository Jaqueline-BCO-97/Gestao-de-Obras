const { getPrisma, isDbConfigured } = require("../config/db");

async function listarUsuarios() {
  if (!isDbConfigured()) {
    const erro = new Error(
      "Banco não configurado. Defina DATABASE_URL no .env (PostgreSQL do Supabase)"
    );
    erro.code = "DATABASE_NOT_CONFIGURED";
    throw erro;
  }

  const prisma = getPrisma();
  return prisma.usuario.findMany({
    select: {
      id: true,
      empresaId: true,
      nome: true,
      email: true,
      tipo: true,
      criadoEm: true,
    },
    orderBy: { criadoEm: "desc" },
  });
}

async function buscarUsuarioPorEmail(email) {
  if (!isDbConfigured()) {
    const erro = new Error(
      "Banco não configurado. Defina DATABASE_URL no .env (PostgreSQL do Supabase)"
    );
    erro.code = "DATABASE_NOT_CONFIGURED";
    throw erro;
  }

  const prisma = getPrisma();
  return prisma.usuario.findUnique({
    where: { email },
  });
}

async function buscarUsuarioPorId(id) {
  if (!isDbConfigured()) {
    const erro = new Error(
      "Banco não configurado. Defina DATABASE_URL no .env (PostgreSQL do Supabase)"
    );
    erro.code = "DATABASE_NOT_CONFIGURED";
    throw erro;
  }

  const prisma = getPrisma();
  return prisma.usuario.findUnique({
    where: { id },
  });
}

async function atualizarSenhaUsuario(id, novaSenhaHash) {
  if (!isDbConfigured()) {
    const erro = new Error(
      "Banco não configurado. Defina DATABASE_URL no .env (PostgreSQL do Supabase)"
    );
    erro.code = "DATABASE_NOT_CONFIGURED";
    throw erro;
  }

  const prisma = getPrisma();
  return prisma.usuario.update({
    where: { id },
    data: { senhaHash: novaSenhaHash },
    select: {
      id: true,
      empresaId: true,
      nome: true,
      email: true,
      tipo: true,
      criadoEm: true,
    },
  });
}

module.exports = {
  listarUsuarios,
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
  atualizarSenhaUsuario,
};
