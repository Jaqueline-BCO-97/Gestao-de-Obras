// Middleware que restringe uma rota a um ou mais papéis (tipo de usuário).
// Uso: app.post("/rota", authMiddleware, exigirPapel("ADMIN"), handler)
function exigirPapel(...papeisPermitidos) {
  return function (req, res, next) {
    const papelDoUsuario = req.usuario?.tipo;

    if (!papelDoUsuario) {
      return res.status(403).json({ erro: "Usuário sem papel definido" });
    }

    if (!papeisPermitidos.includes(papelDoUsuario)) {
      return res.status(403).json({
        erro: `Acesso restrito. Papel necessário: ${papeisPermitidos.join(" ou ")}.`,
      });
    }

    return next();
  };
}

module.exports = exigirPapel;
