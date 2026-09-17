const jwt = require("jsonwebtoken");

/**
 * Middleware de autenticação JWT.
 * Valida o cabeçalho "Authorization: Bearer <token>" e injeta
 * os dados decodificados do usuário em req.usuario.
 */
function authMiddleware(req, res, next) {
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
    const decoded = jwt.verify(token, secret);
    req.usuario = decoded;
    return next();
  } catch (erro) {
    if (erro.name === "TokenExpiredError") {
      return res.status(401).json({ erro: "Token expirado" });
    }
    return res.status(401).json({ erro: "Token inválido" });
  }
}

module.exports = authMiddleware;
