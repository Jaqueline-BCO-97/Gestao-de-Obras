const { getPrisma, isDbConfigured } = require("../config/db");

async function listarUsuarios(empresaId) {
  if (!isDbConfigured()) {
    const erro = new Error(
      "Banco não configurado. Defina DATABASE_URL no .env (PostgreSQL do Supabase)"
    );
    erro.code = "DATABASE_NOT_CONFIGURED";
    throw erro;
  }

  const prisma = getPrisma();
  return prisma.usuario.findMany({
    where: { empresaId },
    select: {
      id: true,
      empresaId: true,
      nome: true,
      email: true,
      tipo: true,
      telefone: true,
      telefoneSecundario: true,
      fotoUrl: true,
      funcionario: { select: { funcao: true, telefone: true, fotoUrl: true } },
      criadoEm: true,
    },
    orderBy: { criadoEm: "desc" },
  });
}

async function criarUsuarioColaborador({ empresaId, nome, email, senhaHash }) {
  if (!isDbConfigured()) {
    const erro = new Error(
      "Banco não configurado. Defina DATABASE_URL no .env (PostgreSQL do Supabase)"
    );
    erro.code = "DATABASE_NOT_CONFIGURED";
    throw erro;
  }

  const prisma = getPrisma();
  return prisma.usuario.create({
    data: { empresaId, nome, email, senhaHash, tipo: "COLABORADOR" },
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

async function buscarPerfilUsuarioPorId(id) {
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
    select: {
      id: true,
      empresaId: true,
      nome: true,
      email: true,
      tipo: true,
      telefone: true,
      telefoneSecundario: true,
      fotoUrl: true,
      endereco: true,
      cpf: true,
      funcionario: { select: { funcao: true, telefone: true, fotoUrl: true } },
    },
  });
}

// Consulta o cadastro profissional vinculado ao login, incluindo o estado de
// atividade e a empresa para validar sessões de colaboradores em cada pedido.
async function buscarFuncionarioPorUsuarioId(usuarioId) {
  if (!isDbConfigured()) {
    const erro = new Error(
      "Banco não configurado. Defina DATABASE_URL no .env (PostgreSQL do Supabase)"
    );
    erro.code = "DATABASE_NOT_CONFIGURED";
    throw erro;
  }

  return getPrisma().funcionario.findUnique({
    where: { usuarioId },
    select: { id: true, empresaId: true, ativo: true },
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
  criarUsuarioColaborador,
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
  buscarPerfilUsuarioPorId,
  buscarFuncionarioPorUsuarioId,
  atualizarSenhaUsuario,
};
