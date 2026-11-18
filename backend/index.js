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
  buscarPerfilUsuarioPorId,
  buscarFuncionarioPorUsuarioId,
  atualizarSenhaUsuario,
  criarUsuarioColaborador,
} = require("./src/repositories/usuarioRepository");
const {
  listarObras,
  buscarObraPorId,
  criarObra,
  listarAlocacoesDaObra,
  alocarFuncionario,
  encerrarAlocacao,
  registrarAndamento,
  validarPermissaoAndamento,
  reagendarObra,
  solicitarConferenciaObra,
  confirmarConclusaoObra,
} = require("./src/repositories/obraRepository");
const pagamentoService = require("./src/services/pagamentoService");
const mercadoPagoService = require("./src/services/mercadoPagoService");
const cloudinaryService = require("./src/services/cloudinaryService");
const authMiddleware = require("./src/middlewares/authMiddleware");
const exigirPapel = require("./src/middlewares/exigirPapel");

const app = express();
app.use(express.json({ limit: "8mb" }));

function exigirEmpresaDoToken(req, res, next) {
  if (typeof req.usuario?.empresaId !== "string" || !req.usuario.empresaId) {
    return res.status(403).json({ erro: "Usuário sem empresa vinculada" });
  }
  return next();
}

function converterDataHoraISO(valor) {
  if (typeof valor !== "string") return null;
  const partes = valor.match(/^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/);
  if (!partes) return null;

  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  if (ano < 1 || mes < 1 || mes > 12) return null;
  const anoBissexto = ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0);
  const diasNoMes = [31, anoBissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (dia < 1 || dia > diasNoMes[mes - 1]) return null;

  if (partes[8] !== "Z") {
    const horaOffset = Number(partes[10]);
    const minutoOffset = Number(partes[11]);
    if (horaOffset > 14 || minutoOffset > 59 || (horaOffset === 14 && minutoOffset !== 0)) return null;
  }

  const instante = new Date(valor);
  return Number.isFinite(instante.getTime()) ? instante : null;
}

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

// O webhook é público por definição, mas só processa eventos com assinatura
// HMAC válida e estado consultado diretamente na API do Mercado Pago.
app.post("/webhooks/mercado-pago", async (req, res) => {
  const segredo = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!segredo) return res.status(503).json({ erro: "Webhook do Mercado Pago não configurado" });

  const tipo = req.query.type || req.query.topic || req.body?.type;
  if (tipo && tipo !== "order") return res.status(200).json({ recebido: true, ignorado: true });

  const dataId = req.query["data.id"];
  const requestId = req.headers["x-request-id"];
  const assinatura = req.headers["x-signature"];
  if (!mercadoPagoService.validarAssinaturaWebhook({ assinatura, requestId, dataId, segredo })) {
    return res.status(401).json({ erro: "Assinatura do webhook inválida" });
  }

  try {
    await pagamentoService.confirmarNotificacaoMercadoPago(dataId);
    return res.status(200).json({ recebido: true });
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") return res.status(503).json({ erro: "Banco temporariamente indisponível" });
    if (erro.code?.startsWith("MERCADO_PAGO")) return res.status(503).json({ erro: "Não foi possível confirmar o evento no provedor" });
    if (erro.code === "P2002" || erro.code === "TRANSACAO_DUPLICADA") {
      return res.status(409).json({ erro: "A transação externa já está associada a outro pagamento" });
    }
    if (["REFERENCIA_EXTERNA_INVALIDA", "PEDIDO_EXTERNO_DIVERGENTE", "MOEDA_INVALIDA", "VALOR_EXTERNO_DIVERGENTE", "RESPOSTA_PROVEDOR_INVALIDA"].includes(erro.code)) {
      return res.status(409).json({ erro: "Os dados confirmados pelo provedor não correspondem à tentativa local" });
    }
    console.error("Erro ao processar webhook do Mercado Pago:", erro.code || erro.message);
    return res.status(500).json({ erro: "Não foi possível processar a confirmação do pagamento" });
  }
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

    if (usuario.tipo === "COLABORADOR") {
      const funcionario = await buscarFuncionarioPorUsuarioId(usuario.id);
      // Usa a mesma resposta genérica de credenciais para não revelar se um
      // colaborador existe, foi desativado ou está associado a outra empresa.
      if (
        !funcionario ||
        funcionario.ativo !== true ||
        funcionario.empresaId !== usuario.empresaId
      ) {
        return res.status(401).json({ erro: "Credenciais inválidas" });
      }
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
    if (
      erro.code === "DATABASE_NOT_CONFIGURED" ||
      (typeof erro.name === "string" && erro.name.startsWith("PrismaClient"))
    ) {
      return res.status(503).json({ erro: "Não foi possível validar as credenciais no momento" });
    }
    console.error("Erro ao realizar login:", erro.message);
    return res.status(500).json({ erro: "Erro ao realizar login" });
  }
});

// Rota protegida para validação da autenticação / usuário logado
app.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const usuario = await buscarPerfilUsuarioPorId(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }
    return res.json({ mensagem: "Acesso autorizado", usuario });
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") {
      return res.status(503).json({ erro: erro.message });
    }
    console.error("Erro ao consultar usuário autenticado:", erro.message);
    return res.status(500).json({ erro: "Erro ao consultar usuário autenticado" });
  }
});

// Lista usuários do banco (model Usuario do Prisma) — rota privada protegida
app.get("/usuarios", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const usuarios = await listarUsuarios(req.usuario.empresaId);
    res.json(usuarios);
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") {
      return res.status(503).json({ erro: erro.message });
    }
    console.error("Erro ao listar usuários:", erro.message);
    res.status(500).json({ erro: "Erro ao listar usuários" });
  }
});

// Cadastro de colaborador vinculado à empresa do usuário autenticado.
// Restrito a ADMIN: só o administrador da empresa pode criar contas de colaborador.
app.post("/colaboradores", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const { nome, email, senha } = req.body || {};
    if (
      typeof nome !== "string" || !nome.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof senha !== "string" || !senha
    ) {
      return res.status(400).json({ erro: "Nome, e-mail e senha são obrigatórios" });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const colaborador = await criarUsuarioColaborador({
      empresaId: req.usuario.empresaId,
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      senhaHash,
    });
    return res.status(201).json({ colaborador });
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") {
      return res.status(503).json({ erro: erro.message });
    }
    if (erro.code === "P2002") {
      return res.status(409).json({ erro: "E-mail já cadastrado" });
    }
    console.error("Erro ao cadastrar colaborador:", erro.message);
    return res.status(500).json({ erro: "Erro ao cadastrar colaborador" });
  }
});

// Obras são sempre criadas e consultadas dentro da empresa do token JWT.
// Criação restrita a ADMIN: leitura (GET) continua liberada pra qualquer usuário autenticado da empresa.
app.post("/obras", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const { nome, descricao, endereco } = req.body || {};
    if (typeof nome !== "string" || !nome.trim()) {
      return res.status(400).json({ erro: "Nome da obra é obrigatório" });
    }
    for (const [campo, valor] of [["descricao", descricao], ["endereco", endereco]]) {
      if (valor !== undefined && typeof valor !== "string") {
        return res.status(400).json({ erro: `Campo ${campo} deve ser texto` });
      }
    }
    const obra = await criarObra({
      empresaId: req.usuario.empresaId,
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      endereco: endereco?.trim() || null,
    });
    return res.status(201).json({ obra });
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") {
      return res.status(503).json({ erro: erro.message });
    }
    console.error("Erro ao cadastrar obra:", erro.message);
    return res.status(500).json({ erro: "Erro ao cadastrar obra" });
  }
});

app.get("/obras", authMiddleware, exigirEmpresaDoToken, async (req, res) => {
  try {
    // Consulta as obras da empresa já aplicando usuário e perfil do token.
    const obras = await listarObras(req.usuario.empresaId, req.usuario.id, req.usuario.tipo);
    return res.json(obras);
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") {
      return res.status(503).json({ erro: erro.message });
    }
    console.error("Erro ao listar obras:", erro.message);
    return res.status(500).json({ erro: "Erro ao listar obras" });
  }
});

app.get("/obras/:id", authMiddleware, exigirEmpresaDoToken, async (req, res) => {
  try {
    // Busca a obra dentro da empresa e do escopo permitido ao perfil.
    const obra = await buscarObraPorId(req.params.id, req.usuario.empresaId, req.usuario.id, req.usuario.tipo);
    // Usa a mesma mensagem para obra ausente e obra fora do escopo.
    if (!obra) return res.status(404).json({ erro: "Obra não encontrada" });
    // Devolve diretamente a obra no formato esperado pelo frontend.
    return res.json(obra);
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") {
      return res.status(503).json({ erro: erro.message });
    }
    console.error("Erro ao consultar obra:", erro.message);
    return res.status(500).json({ erro: "Erro ao consultar obra" });
  }
});

// Só ADMIN da empresa pode confirmar novo intervalo; obra e autor vêm da sessão,
// e a mudança junto do evento visível ao cliente é confirmada numa transação.
app.patch("/obras/:id/agendamento", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const corpo = req.body;
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) {
      return res.status(400).json({ erro: "Informe agendadaPara e prazoFinal" });
    }

    const agendadaPara = converterDataHoraISO(corpo.agendadaPara);
    const prazoFinal = converterDataHoraISO(corpo.prazoFinal);
    if (!agendadaPara || !prazoFinal) {
      return res.status(400).json({ erro: "agendadaPara e prazoFinal devem ser datas ISO 8601 válidas com fuso horário" });
    }
    if (prazoFinal <= agendadaPara) {
      return res.status(400).json({ erro: "prazoFinal deve ser posterior a agendadaPara" });
    }

    const resultado = await reagendarObra({
      obraId: req.params.id,
      empresaId: req.usuario.empresaId,
      administradorId: req.usuario.id,
      agendadaPara,
      prazoFinal,
    });
    if (!resultado) return res.status(404).json({ erro: "Obra não encontrada" });
    return res.json({
      obra: {
        ...resultado.obra,
        agendadaPara: resultado.agendadaPara.toISOString(),
        prazoFinal: resultado.prazoFinal.toISOString(),
      },
      evento: resultado.evento,
      alterada: resultado.alterada,
    });
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") return res.status(503).json({ erro: erro.message });
    if (erro.code === "AGENDAMENTO_CONFLITO") return res.status(409).json({ erro: erro.message });
    if (erro.code === "AGENDAMENTO_CONCORRENTE" || erro.code === "P2034") {
      return res.status(409).json({ erro: erro.message || "O agendamento foi alterado por outra operação; atualize e tente novamente" });
    }
    console.error("Erro ao reagendar obra:", erro.code || erro.message);
    return res.status(500).json({ erro: "Erro ao reagendar obra" });
  }
});

// A conclusão percorre duas operações explícitas, cada uma autorizada por perfil.
app.post("/obras/:id/conclusao/solicitar", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const resultado = await solicitarConferenciaObra({ obraId: req.params.id, empresaId: req.usuario.empresaId, administradorId: req.usuario.id });
    return res.json(resultado);
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") return res.status(503).json({ erro: erro.message });
    if (erro.code === "OBRA_NAO_ENCONTRADA") return res.status(404).json({ erro: erro.message });
    if (erro.code === "STATUS_INVALIDO") return res.status(409).json({ erro: erro.message });
    if (erro.code === "P2034") return res.status(409).json({ erro: "A obra foi alterada por outra operação; atualize e tente novamente" });
    console.error("Erro ao solicitar conferência da obra:", erro.code || erro.message);
    return res.status(500).json({ erro: "Erro ao solicitar conferência da obra" });
  }
});

app.post("/obras/:id/conclusao/confirmar", authMiddleware, exigirEmpresaDoToken, exigirPapel("CLIENTE"), async (req, res) => {
  try {
    const resultado = await confirmarConclusaoObra({ obraId: req.params.id, empresaId: req.usuario.empresaId, clienteId: req.usuario.id });
    return res.json(resultado);
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") return res.status(503).json({ erro: erro.message });
    if (erro.code === "OBRA_NAO_ENCONTRADA") return res.status(404).json({ erro: erro.message });
    if (erro.code === "STATUS_INVALIDO") return res.status(409).json({ erro: erro.message });
    if (erro.code === "P2034") return res.status(409).json({ erro: "A obra foi alterada por outra operação; atualize e tente novamente" });
    console.error("Erro ao confirmar conclusão da obra:", erro.code || erro.message);
    return res.status(500).json({ erro: "Erro ao confirmar conclusão da obra" });
  }
});

// O cliente inicia somente pagamentos das próprias obras. Valor e saldo são
// revalidados no repositório contra as parcelas persistidas.
app.post("/obras/:id/pagamento", authMiddleware, exigirEmpresaDoToken, exigirPapel("CLIENTE"), async (req, res) => {
  try {
    const { parcelaId, valor } = req.body || {};
    const chaveIdempotencia = req.headers["idempotency-key"];
    if (typeof parcelaId !== "string" || !parcelaId.trim()) {
      return res.status(400).json({ erro: "parcelaId é obrigatório" });
    }
    if (typeof chaveIdempotencia !== "string" || !/^[\x21-\x7E]{8,128}$/.test(chaveIdempotencia)) {
      return res.status(400).json({ erro: "O cabeçalho Idempotency-Key é obrigatório e deve ter de 8 a 128 caracteres" });
    }
    const valorTexto = typeof valor === "number" && Number.isFinite(valor) ? String(valor) : valor;
    if (typeof valorTexto !== "string" && typeof valorTexto !== "number") {
      return res.status(400).json({ erro: "valor deve ser um número positivo com até duas casas decimais" });
    }
    const normalizado = String(valorTexto);
    if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(normalizado)) {
      return res.status(400).json({ erro: "valor deve ser um número positivo com até duas casas decimais" });
    }
    const [parteInteira, parteDecimal = ""] = normalizado.split(".");
    const valorCentavos = Number(parteInteira) * 100 + Number(parteDecimal.padEnd(2, "0"));
    if (!Number.isSafeInteger(valorCentavos) || valorCentavos <= 0) {
      return res.status(400).json({ erro: "valor deve ser maior que zero" });
    }

    const resultado = await pagamentoService.iniciarPagamento({
      obraId: req.params.id,
      empresaId: req.usuario.empresaId,
      usuarioId: req.usuario.id,
      parcelaId: parcelaId.trim(),
      valorCentavos,
      chaveIdempotencia,
    });
    return res.status(resultado.repetida ? 200 : 201).json({
      pagamento: resultado.pagamento,
      checkoutUrl: resultado.checkoutUrl,
    });
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED" || erro.code === "MERCADO_PAGO_NAO_CONFIGURADO") {
      return res.status(503).json({ erro: erro.message });
    }
    const respostas = {
      OBRA_NAO_ENCONTRADA: [404, "Obra não encontrada para este cliente"],
      PARCELAS_NAO_ENCONTRADAS: [409, "A obra não possui parcelas cadastradas"],
      PARCELA_NAO_ENCONTRADA: [404, "Parcela não encontrada nesta obra"],
      SALDO_INSUFICIENTE: [409, "O valor excede o saldo pendente da obra ou da parcela"],
      CONCLUSAO_NAO_CONFIRMADA: [409, "A segunda parcela só pode ser paga após a confirmação da conclusão da obra"],
      CHAVE_IDEMPOTENCIA_REUTILIZADA: [409, "A chave de idempotência já foi usada com outros dados"],
    };
    if (respostas[erro.code]) {
      const [status, mensagem] = respostas[erro.code];
      return res.status(status).json({ erro: mensagem });
    }
    if (erro.code === "P2034") return res.status(409).json({ erro: "Saldo alterado por outro pagamento; atualize e tente novamente" });
    if (erro.code === "P2002") return res.status(409).json({ erro: "Identificador de pagamento duplicado" });
    if (erro.code?.startsWith("MERCADO_PAGO")) {
      console.error("Falha ao criar checkout sandbox:", erro.code, erro.statusProvedor || "");
      const tentativaFinalizada = erro.code === "MERCADO_PAGO_REJEITOU" && erro.statusProvedor >= 400 && erro.statusProvedor < 500;
      return res.status(502).json({ erro: "Não foi possível iniciar o checkout do Mercado Pago", tentativaFinalizada });
    }
    console.error("Erro ao iniciar pagamento:", erro.code || erro.message);
    return res.status(500).json({ erro: "Erro ao iniciar pagamento" });
  }
});

// Retoma somente uma tentativa persistida pertencente ao cliente e à obra informados.
app.post("/obras/:id/pagamentos/:pagamentoId/retomar", authMiddleware, exigirEmpresaDoToken, exigirPapel("CLIENTE"), async (req, res) => {
  try {
    const resultado = await pagamentoService.retomarTentativaPagamento({
      obraId: req.params.id,
      empresaId: req.usuario.empresaId,
      usuarioId: req.usuario.id,
      pagamentoId: req.params.pagamentoId,
    });
    return res.status(200).json({ pagamento: resultado.pagamento, checkoutUrl: resultado.checkoutUrl });
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED" || erro.code === "MERCADO_PAGO_NAO_CONFIGURADO") {
      return res.status(503).json({ erro: erro.message });
    }
    if (erro.code === "TENTATIVA_NAO_ENCONTRADA") return res.status(404).json({ erro: erro.message });
    if (erro.code === "TENTATIVA_NAO_PENDENTE" || erro.code === "CONCLUSAO_NAO_CONFIRMADA") {
      return res.status(409).json({ erro: erro.message });
    }
    if (erro.code?.startsWith("MERCADO_PAGO")) {
      console.error("Falha ao retomar checkout sandbox:", erro.code, erro.statusProvedor || "");
      return res.status(502).json({ erro: "Não foi possível retomar o checkout do Mercado Pago" });
    }
    console.error("Erro ao retomar tentativa de pagamento:", erro.code || erro.message);
    return res.status(500).json({ erro: "Erro ao retomar tentativa de pagamento" });
  }
});

// Consulta separadamente as escalas abertas e encerradas, sempre na empresa
// do administrador autenticado para manter o histórico fora do alcance alheio.
app.get("/obras/:id/colaboradores", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const alocacoes = await listarAlocacoesDaObra(req.params.id, req.usuario.empresaId);
    if (!alocacoes) return res.status(404).json({ erro: "Obra não encontrada" });
    return res.json(alocacoes);
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") return res.status(503).json({ erro: erro.message });
    console.error("Erro ao consultar alocações da obra:", erro.message);
    return res.status(500).json({ erro: "Erro ao consultar alocações da obra" });
  }
});

// Apenas administradores podem abrir uma escala; obra e funcionário são
// validados no repositório contra a empresa obtida da sessão, nunca do body.
app.post("/obras/:id/colaboradores", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const { funcionarioId } = req.body || {};
    if (typeof funcionarioId !== "string" || !funcionarioId.trim()) {
      return res.status(400).json({ erro: "funcionarioId é obrigatório" });
    }

    const alocacao = await alocarFuncionario({
      obraId: req.params.id,
      empresaId: req.usuario.empresaId,
      funcionarioId: funcionarioId.trim(),
      administradorId: req.usuario.id,
    });
    return res.status(201).json({ alocacao });
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") return res.status(503).json({ erro: erro.message });
    const respostas = {
      OBRA_NAO_ENCONTRADA: [404, "Obra não encontrada"],
      FUNCIONARIO_NAO_ENCONTRADO: [404, "Funcionário não encontrado nesta empresa"],
      NIVEL_FUNCIONARIO_INVALIDO: [400, "Somente funcionários de nível Responsável podem ser alocados"],
      FUNCIONARIO_INATIVO: [409, "Funcionário inativo não pode ser alocado"],
      VINCULO_USUARIO_INVALIDO: [409, "O login vinculado ao funcionário não é um colaborador válido desta empresa"],
      ALOCACAO_DUPLICADA: [409, "Funcionário já possui alocação aberta nesta obra"],
    };
    if (respostas[erro.code]) {
      const [status, mensagem] = respostas[erro.code];
      return res.status(status).json({ erro: mensagem });
    }
    if (erro.code === "P2034") return res.status(409).json({ erro: "A alocação conflitou com outra alteração. Tente novamente" });
    console.error("Erro ao alocar funcionário na obra:", erro.message);
    return res.status(500).json({ erro: "Erro ao alocar funcionário na obra" });
  }
});

// PATCH encerra a escala sem excluir o registro, preservando a trilha histórica.
app.patch("/obras/:id/colaboradores/:alocacaoId", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const { motivo } = req.body || {};
    if (motivo !== undefined && motivo !== null && typeof motivo !== "string") {
      return res.status(400).json({ erro: "motivo deve ser texto" });
    }
    if (typeof motivo === "string" && motivo.trim().length > 500) {
      return res.status(400).json({ erro: "motivo deve ter no máximo 500 caracteres" });
    }

    const alocacao = await encerrarAlocacao({
      obraId: req.params.id,
      empresaId: req.usuario.empresaId,
      alocacaoId: req.params.alocacaoId,
      administradorId: req.usuario.id,
      motivo: typeof motivo === "string" ? (motivo.trim() || null) : null,
    });
    return res.json({ alocacao });
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") return res.status(503).json({ erro: erro.message });
    const respostas = {
      OBRA_NAO_ENCONTRADA: [404, "Obra não encontrada"],
      ALOCACAO_NAO_ENCONTRADA: [404, "Alocação não encontrada nesta obra"],
      ALOCACAO_JA_ENCERRADA: [409, "Esta alocação já foi encerrada"],
    };
    if (respostas[erro.code]) {
      const [status, mensagem] = respostas[erro.code];
      return res.status(status).json({ erro: mensagem });
    }
    if (erro.code === "P2034") return res.status(409).json({ erro: "A alocação conflitou com outra alteração. Tente novamente" });
    console.error("Erro ao encerrar alocação:", erro.message);
    return res.status(500).json({ erro: "Erro ao encerrar alocação" });
  }
});

// Colaborador alocado e ADMIN da empresa podem registrar progresso; a foto é
// armazenada antes do evento para nunca publicar uma referência sem arquivo.
app.post("/obras/:id/andamento", authMiddleware, exigirEmpresaDoToken, exigirPapel("COLABORADOR", "ADMIN"), async (req, res) => {
  try {
    const corpo = req.body || {};
    const descricao = corpo.descricao;
    const tiposPermitidos = ["ANOTACAO", "ATUALIZACAO", "OCORRENCIA"];
    const tipo = corpo.tipo === undefined ? "ATUALIZACAO" : corpo.tipo;
    if (typeof descricao !== "string" || !descricao.trim()) {
      return res.status(400).json({ erro: "Descrição do andamento é obrigatória" });
    }
    if (descricao.trim().length > 2000) {
      return res.status(400).json({ erro: "Descrição deve ter no máximo 2000 caracteres" });
    }
    if (typeof tipo !== "string" || !tiposPermitidos.includes(tipo)) {
      return res.status(400).json({ erro: `tipo deve ser um destes valores: ${tiposPermitidos.join(", ")}` });
    }
    if (corpo.fotoUrl != null) {
      return res.status(400).json({ erro: "fotoUrl não pode ser enviado pelo cliente; envie a foto em foto.data" });
    }
    if (corpo.visivelParaCliente !== undefined && (req.usuario.tipo !== "ADMIN" || typeof corpo.visivelParaCliente !== "boolean")) {
      return res.status(400).json({ erro: "visivelParaCliente deve ser booleano e só pode ser definido pelo ADMIN" });
    }

    let fotoUrl = null;
    if (corpo.foto !== undefined) {
      if (req.is("multipart/form-data")) return res.status(415).json({ erro: "Envie a foto como JSON em foto.data" });
      const autorizada = await validarPermissaoAndamento({
        obraId: req.params.id,
        empresaId: req.usuario.empresaId,
        usuarioId: req.usuario.id,
        papel: req.usuario.tipo,
      });
      if (!autorizada) return res.status(404).json({ erro: "Obra não encontrada" });
      fotoUrl = await cloudinaryService.enviarFotoObra({ foto: corpo.foto, obraId: req.params.id });
    }

    const resultado = await registrarAndamento({
      obraId: req.params.id,
      empresaId: req.usuario.empresaId,
      usuarioId: req.usuario.id,
      tipo,
      descricao: descricao.trim(),
      fotoUrl,
      papel: req.usuario.tipo,
      visivelParaCliente: corpo.visivelParaCliente ?? true,
    });
    if (!resultado) return res.status(404).json({ erro: "Obra não encontrada" });
    return res.status(201).json(resultado);
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") return res.status(503).json({ erro: erro.message });
    if (erro.code === "FOTO_INVALIDA") return res.status(400).json({ erro: erro.message });
    if (erro.code?.startsWith("CLOUDINARY")) return res.status(503).json({ erro: erro.message });
    if (erro.code === "COLABORADOR_SEM_VINCULO" || erro.code === "COLABORADOR_SEM_ALOCACAO") {
      return res.status(403).json({ erro: erro.message });
    }
    if (erro.code === "P2034") {
      return res.status(409).json({ erro: "A alocação foi alterada durante o registro. Atualize a obra e tente novamente" });
    }
    console.error("Erro ao registrar andamento da obra:", erro.message);
    return res.status(500).json({ erro: "Erro ao registrar andamento da obra" });
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
