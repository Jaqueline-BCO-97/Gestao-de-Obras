const { getPrisma, isDbConfigured } = require("../config/db");
const { Prisma } = require("@prisma/client");

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

  const [perfil] = await getPrisma().$queryRaw(Prisma.sql`
    SELECT usuario.id, usuario."empresaId", usuario.nome, usuario.email, usuario.tipo,
      usuario.telefone, usuario."telefoneSecundario", usuario."fotoUrl", usuario.endereco,
      usuario.estado, usuario.cidade, usuario.bairro, usuario.numero, usuario.complemento,
      usuario.apartamento, usuario.bloco, usuario."semApartamento", usuario."semBloco", usuario.cpf,
      CASE WHEN funcionario.id IS NULL THEN NULL ELSE jsonb_build_object(
        'funcao', funcionario.funcao, 'telefone', funcionario.telefone, 'fotoUrl', funcionario."fotoUrl"
      ) END AS funcionario,
      CASE WHEN empresa.id IS NULL THEN NULL ELSE jsonb_build_object(
        'nome', empresa.nome, 'slogan', empresa.slogan, 'cnpj', empresa.cnpj, 'cpfResponsavel', empresa."cpfResponsavel",
        'telefone', empresa.telefone, 'telefoneSecundario', empresa."telefoneSecundario",
        'enderecoResponsavel', empresa."enderecoResponsavel", 'endereco', empresa.endereco,
        'estado', empresa.estado, 'cidade', empresa.cidade, 'bairro', empresa.bairro,
        'numero', empresa.numero, 'complemento', empresa.complemento
      ) END AS empresa
    FROM "Usuario" usuario
    LEFT JOIN "Funcionario" funcionario ON funcionario."usuarioId" = usuario.id
    LEFT JOIN "Empresa" empresa ON empresa.id = usuario."empresaId"
    WHERE usuario.id = ${id}
    LIMIT 1`);
  return perfil || null;
}

async function buscarAutenticacaoUsuarioPorId(id) {
  if (!isDbConfigured()) {
    const erro = new Error("Banco não configurado. Defina DATABASE_URL no .env (PostgreSQL do Supabase)");
    erro.code = "DATABASE_NOT_CONFIGURED";
    throw erro;
  }

  const [usuario] = await getPrisma().$queryRaw(Prisma.sql`
    SELECT usuario.id, usuario."empresaId", usuario.email, usuario.tipo,
      CASE WHEN funcionario.id IS NULL THEN NULL ELSE jsonb_build_object(
        'empresaId', funcionario."empresaId", 'ativo', funcionario.ativo
      ) END AS funcionario
    FROM "Usuario" usuario
    LEFT JOIN "Funcionario" funcionario ON funcionario."usuarioId" = usuario.id
    WHERE usuario.id = ${id}
    LIMIT 1`);
  return usuario || null;
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
  buscarAutenticacaoUsuarioPorId,
  buscarFuncionarioPorUsuarioId,
  atualizarSenhaUsuario,
};
