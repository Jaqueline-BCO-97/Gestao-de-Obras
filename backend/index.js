// Servidor único do backend ObraMaster (Express + Prisma).
// Banco: PostgreSQL do Supabase via DATABASE_URL (ver backend/.env.example).
// Consolida as rotas das PRs anteriores:
// - GET / (hello world do backend, vindo do antigo src/server.js)
// - GET /health (health check, vindo do antigo index.js)
// - GET /usuarios (lista usuarios via Prisma)
require("dotenv").config();
const express = require("express");
const { isDbConfigured } = require("./src/config/db");
const { listarUsuarios } = require("./src/repositories/usuarioRepository");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Rota raiz — hello world do backend
app.get("/", (req, res) => {
  res.send("Hello World! Backend Gestão de Obras funcionando!");
});

// Rota de "saúde" — confirma que o servidor está de pé e respondendo
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    db: isDbConfigured() ? "configured" : "not_configured",
  });
});

// Lista usuários do banco (model Usuario do Prisma)
app.get("/usuarios", async (req, res) => {
  try {
    const usuarios = await listarUsuarios();
    res.json(usuarios);
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") {
      return res.status(503).json({ erro: erro.message });
    }
    console.error("Erro ao listar usuários:", erro.message);
    res.status(500).json({ erro: "Erro ao listar usuários" });
  }
});

// Só sobe o servidor quando executado diretamente (permite require em testes)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend do ObraMaster rodando na porta ${PORT}`);
    if (!isDbConfigured()) {
      console.log(
        "Aviso: DATABASE_URL não definida. /usuarios retornará 503 até configurar o .env"
      );
    }
  });
}

module.exports = app;
