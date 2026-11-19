const jwt = require("jsonwebtoken");
const {
  buscarPerfilUsuarioPorId,
  buscarFuncionarioPorUsuarioId,
} = require("../repositories/usuarioRepository");

/**
 * Middleware de autenticação JWT.
 * Valida o cabeçalho "Authorization: Bearer <token>" e injeta
 * os dados decodificados do usuário em req.usuario.
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ erro: "Token de autenticação não fornecido" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res
      .status(401)
      .json({ erro: "Formato de token inválido. Formato esperado: Bearer <token>" });
  }

  const token = parts[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("JWT_SECRET não configurado nas variáveis de ambiente");
    return res
      .status(500)
      .json({ erro: "Erro interno de configuração de autenticação" });
  }

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (
      typeof decoded.id !== "string" ||
      typeof decoded.email !== "string" ||
      typeof decoded.tipo !== "string" ||
      typeof decoded.empresaId !== "string"
    ) {
      return res.status(401).json({ erro: "Token inválido" });
    }

    const usuarioAtual = await buscarPerfilUsuarioPorId(decoded.id);
    if (
      !usuarioAtual ||
      usuarioAtual.email !== decoded.email ||
      usuarioAtual.tipo !== decoded.tipo ||
      usuarioAtual.empresaId !== decoded.empresaId
    ) {
      return res.status(401).json({ erro: "Sessão inválida ou expirada" });
    }

    if (usuarioAtual.tipo === "COLABORADOR") {
      const funcionario = await buscarFuncionarioPorUsuarioId(usuarioAtual.id);
      // O estado ativo é consultado no banco a cada requisição para invalidar
      // imediatamente sessões antigas após a desativação do funcionário.
      if (
        !funcionario ||
        funcionario.ativo !== true ||
        funcionario.empresaId !== usuarioAtual.empresaId
      ) {
        return res.status(403).json({ erro: "Acesso bloqueado: colaborador inativo ou sem vínculo válido" });
      }
    }

    req.usuario = usuarioAtual;
    return next();
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") {
      return res.status(503).json({ erro: erro.message });
    }
    if (typeof erro.name === "string" && erro.name.startsWith("PrismaClient")) {
      console.error("Erro ao validar usuário autenticado:", erro.message);
      return res.status(503).json({ erro: "Não foi possível validar a sessão" });
    }
    if (erro.name === "TokenExpiredError") {
      return res.status(401).json({ erro: "Token expirado" });
    }
    return res.status(401).json({ erro: "Token inválido" });
  }
}

module.exports = authMiddleware;
