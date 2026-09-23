// Servidor único do backend ObraMaster (Express + Prisma).
// Banco: PostgreSQL do Supabase via DATABASE_URL (ver backend/.env.example).
// Consolida as rotas das PRs anteriores:
// - GET / (hello world do backend, vindo do antigo src/server.js)
// - GET /health (health check, vindo do antigo index.js)
// - GET /usuarios (lista usuarios via Prisma)
require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { isDbConfigured } = require("./src/config/db");
const {
  listarUsuarios,
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
  atualizarSenhaUsuario,
} = require("./src/repositories/usuarioRepository");
const authMiddleware = require("./src/middlewares/authMiddleware");

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

// Rota de autenticação — login com e-mail e senha
app.post("/auth/login", async (req, res) => {
  try {
    const { email, senha } = req.body || {};

    if (!email || !senha) {
      return res.status(400).json({ erro: "E-mail e senha são obrigatórios" });
    }

    const usuario = await buscarUsuarioPorEmail(email);
    if (!usuario) {
      return res.status(401).json({ erro: "Credenciais inválidas" });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      return res.status(401).json({ erro: "Credenciais inválidas" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET não configurado nas variáveis de ambiente");
      return res
        .status(500)
        .json({ erro: "Erro interno de configuração de autenticação" });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        tipo: usuario.tipo,
        empresaId: usuario.empresaId,
      },
      secret,
      { expiresIn: "8h" }
    );

    return res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        empresaId: usuario.empresaId,
      },
    });
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") {
      return res.status(503).json({ erro: erro.message });
    }
    console.error("Erro ao realizar login:", erro.message);
    return res.status(500).json({ erro: "Erro ao realizar login" });
  }
});

// Rota protegida para validação da autenticação / usuário logado
app.get("/auth/me", authMiddleware, (req, res) => {
  res.json({
    mensagem: "Acesso autorizado",
    usuario: req.usuario,
  });
});

// Lista usuários do banco (model Usuario do Prisma) — rota privada protegida
app.get("/usuarios", authMiddleware, async (req, res) => {
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

// Alteração da própria senha do usuário autenticado
app.patch("/usuarios/me/senha", authMiddleware, async (req, res) => {
  try {
    const { senhaAtual, novaSenha, senha_atual, nova_senha } = req.body || {};
    const senhaAtualFinal = senhaAtual ?? senha_atual;
    const novaSenhaFinal = novaSenha ?? nova_senha;

    if (
      !senhaAtualFinal ||
      !novaSenhaFinal ||
      typeof senhaAtualFinal !== "string" ||
      typeof novaSenhaFinal !== "string"
    ) {
      return res
        .status(400)
        .json({ erro: "Senha atual e nova senha são obrigatórias" });
    }

    const usuarioId = req.usuario.id;
    const usuario = await buscarUsuarioPorId(usuarioId);
    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    const senhaValida = await bcrypt.compare(senhaAtualFinal, usuario.senhaHash);
    if (!senhaValida) {
      return res.status(400).json({ erro: "Senha atual incorreta" });
    }

    const novaSenhaHash = await bcrypt.hash(novaSenhaFinal, 10);
    await atualizarSenhaUsuario(usuarioId, novaSenhaHash);

    return res.json({ mensagem: "Senha alterada com sucesso" });
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") {
      return res.status(503).json({ erro: erro.message });
    }
    console.error("Erro ao alterar senha:", erro.message);
    return res.status(500).json({ erro: "Erro ao alterar senha" });
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
