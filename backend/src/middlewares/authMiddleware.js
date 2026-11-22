const jwt = require("jsonwebtoken");
const { buscarAutenticacaoUsuarioPorId } = require("../repositories/usuarioRepository");

const TEMPO_CACHE_MS = 60_000;
const LIMITE_CACHE = 5000;
const cacheSessoes = new Map();
const geracoesCache = new Map();

function avancarGeracao(usuarioId) {
  geracoesCache.set(usuarioId, (geracoesCache.get(usuarioId) || 0) + 1);
}

function guardarSessao(usuario) {
  if (!usuario?.id) return;
  avancarGeracao(usuario.id);
  if (cacheSessoes.size >= LIMITE_CACHE) {
    const primeiraChave = cacheSessoes.keys().next().value;
    if (primeiraChave) cacheSessoes.delete(primeiraChave);
  }
  cacheSessoes.set(usuario.id, {
    expiraEm: Date.now() + TEMPO_CACHE_MS,
    usuario: { id: usuario.id, email: usuario.email, tipo: usuario.tipo, empresaId: usuario.empresaId },
  });
}

function invalidarSessaoUsuario(usuarioId) {
  if (usuarioId) {
    avancarGeracao(usuarioId);
    cacheSessoes.delete(usuarioId);
  } else {
    for (const id of cacheSessoes.keys()) avancarGeracao(id);
    cacheSessoes.clear();
  }
}

async function carregarSessao(usuarioId) {
  const atual = cacheSessoes.get(usuarioId);
  if (atual?.expiraEm > Date.now()) {
    if (atual.promessa) return atual.promessa;
    return { usuario: atual.usuario, bloqueado: Boolean(atual.bloqueado) };
  }
  if (atual) cacheSessoes.delete(usuarioId);

  const geracao = geracoesCache.get(usuarioId) || 0;
  const promessa = (async () => {
    const usuario = await buscarAutenticacaoUsuarioPorId(usuarioId);
    if (!usuario) return { usuario: null, bloqueado: false };
    if (usuario.tipo === "COLABORADOR" && (
      !usuario.funcionario ||
      usuario.funcionario.ativo !== true ||
      usuario.funcionario.empresaId !== usuario.empresaId
    )) return { usuario: null, bloqueado: true };
    return { usuario: { id: usuario.id, email: usuario.email, tipo: usuario.tipo, empresaId: usuario.empresaId }, bloqueado: false };
  })();
  cacheSessoes.set(usuarioId, { expiraEm: Date.now() + TEMPO_CACHE_MS, usuario: null, promessa });
  try {
    const resultado = await promessa;
    if ((geracoesCache.get(usuarioId) || 0) !== geracao) return carregarSessao(usuarioId);
    cacheSessoes.set(usuarioId, { expiraEm: Date.now() + TEMPO_CACHE_MS, ...resultado });
    return resultado;
  } catch (erro) {
    cacheSessoes.delete(usuarioId);
    throw erro;
  }
}

/**
 * Verifica a assinatura do JWT em cada requisição e consulta o banco no máximo
 * uma vez por usuário a cada 60 segundos. Login preenche o cache após validar
 * senha e vínculo; mudanças de papel, escala ou acesso invalidam a entrada.
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ erro: "Token de autenticação não fornecido" });

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ erro: "Formato de token inválido. Formato esperado: Bearer <token>" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET não configurado nas variáveis de ambiente");
    return res.status(500).json({ erro: "Erro interno de configuração de autenticação" });
  }

  try {
    const decoded = jwt.verify(parts[1], secret, { algorithms: ["HS256"] });
    if (
      typeof decoded.id !== "string" ||
      typeof decoded.email !== "string" ||
      typeof decoded.tipo !== "string" ||
      typeof decoded.empresaId !== "string"
    ) return res.status(401).json({ erro: "Token inválido" });

    const { usuario, bloqueado } = await carregarSessao(decoded.id);
    if (bloqueado) return res.status(403).json({ erro: "Acesso bloqueado: colaborador inativo ou sem vínculo válido" });
    if (!usuario || usuario.email !== decoded.email || usuario.tipo !== decoded.tipo || usuario.empresaId !== decoded.empresaId) {
      return res.status(401).json({ erro: "Sessão inválida ou expirada" });
    }

    req.usuario = usuario;
    return next();
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") return res.status(503).json({ erro: erro.message });
    if (typeof erro.name === "string" && erro.name.startsWith("PrismaClient")) {
      console.error("Erro ao validar usuário autenticado:", erro.message);
      return res.status(503).json({ erro: "Não foi possível validar a sessão" });
    }
    if (erro.name === "TokenExpiredError") return res.status(401).json({ erro: "Token expirado" });
    return res.status(401).json({ erro: "Token inválido" });
  }
}

authMiddleware.guardarSessao = guardarSessao;
authMiddleware.invalidarSessaoUsuario = invalidarSessaoUsuario;

module.exports = authMiddleware;
