const { getPrisma, isDbConfigured } = require("../config/db");

function exigirBancoConfigurado() {
  if (!isDbConfigured()) {
    const erro = new Error(
      "Banco não configurado. Defina DATABASE_URL no .env (PostgreSQL do Supabase)"
    );
    erro.code = "DATABASE_NOT_CONFIGURED";
    throw erro;
  }
}

async function listarObras(empresaId) {
  exigirBancoConfigurado();
  return getPrisma().obra.findMany({
    where: { empresaId },
    orderBy: { criadoEm: "desc" },
  });
}

async function buscarObraPorId(id, empresaId) {
  exigirBancoConfigurado();
  return getPrisma().obra.findFirst({ where: { id, empresaId } });
}

async function criarObra({ empresaId, nome, descricao, endereco }) {
  exigirBancoConfigurado();
  return getPrisma().obra.create({
    data: { empresaId, nome, descricao, endereco },
  });
}

module.exports = { listarObras, buscarObraPorId, criarObra };
