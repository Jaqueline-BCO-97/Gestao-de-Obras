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
const crypto = require("node:crypto");
const { Prisma } = require("@prisma/client");
const {
  getPrisma,
  isDbConfigured,
  getQueryCount,
  executarNaRequisicaoDb,
  iniciarRequisicaoDb,
  finalizarRequisicaoDb,
} = require("./src/config/db");
const { comCacheEmpresa, invalidarCacheEmpresa } = require("./src/services/cacheConsultas");
// Reutiliza a mesma validação nas rotas de criação e edição de funcionários.
const { validarDisponibilidades } = require("./src/utils/disponibilidadeFuncionario");
// Reutiliza os requisitos de senha somente na criação de contas por convite.
const { validarSenhaConvite } = require("./src/utils/validarSenhaConvite");
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
  iniciarExecucaoObra,
  confirmarPrimeiraParcela,
  moverAlocacao,
  atualizarDadosObra,
  anexarFotoObra,
  arquivarObra,
  restaurarObra,
  listarObrasArquivadas,
} = require("./src/repositories/obraRepository");
const pagamentoService = require("./src/services/pagamentoService");
const mercadoPagoService = require("./src/services/mercadoPagoService");
const cloudinaryService = require("./src/services/cloudinaryService");
const authMiddleware = require("./src/middlewares/authMiddleware");
const { guardarSessao, invalidarSessaoUsuario } = authMiddleware;
const exigirPapel = require("./src/middlewares/exigirPapel");
const { cpfValido, somenteDigitosCpf } = require("./src/utils/cpf");
const { cnpjValido, somenteDigitosCnpj } = require("./src/utils/cnpj");

const app = express();
app.use(express.json({ limit: "40mb" }));

// X-DB-Query-Count counts application data statements (SELECT/DML). Prisma's
// BEGIN/COMMIT and pooler housekeeping are still visible in DEBUG_QUERIES.
app.use((req, res, next) => {
  const contexto = iniciarRequisicaoDb(`${req.method} ${req.path}`);
  const finalizar = () => finalizarRequisicaoDb(contexto);
  res.once("finish", finalizar);
  res.once("close", finalizar);
  const enviar = res.send;
  res.send = function enviarComMetricas(...argumentos) {
    if (!res.headersSent) res.setHeader("X-DB-Query-Count", String(getQueryCount(contexto)));
    return enviar.apply(this, argumentos);
  };
  return executarNaRequisicaoDb(contexto, () => next());
});

// Qualquer escrita autenticada invalida as listas quentes da empresa após o
// handler concluir com sucesso. A identidade vem do middleware de sessão.
app.use((req, res, next) => {
  res.on("finish", () => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && res.statusCode < 400) {
      invalidarCacheEmpresa(req.usuario?.empresaId);
    }
  });
  next();
});

function exigirEmpresaDoToken(req, res, next) {
  if (typeof req.usuario?.empresaId !== "string" || !req.usuario.empresaId) {
    return res.status(403).json({ erro: "Usuário sem empresa vinculada" });
  }
  return next();
}

function converterDataISO(valor) {
  if (typeof valor !== "string") return null;
  const dataSemHorario = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dataSemHorario) {
    const ano = Number(dataSemHorario[1]);
    const mes = Number(dataSemHorario[2]);
    const dia = Number(dataSemHorario[3]);
    if (ano < 1 || mes < 1 || mes > 12) return null;
    const bissexto = ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0);
    const diasNoMes = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (dia < 1 || dia > diasNoMes[mes - 1]) return null;
    return new Date(Date.UTC(ano, mes - 1, dia, 12));
  }
  return null;
}

function somarMesesPreservandoDia(dataInicial, quantidadeMeses) {
  const dia = dataInicial.getUTCDate();
  const resultado = new Date(Date.UTC(dataInicial.getUTCFullYear(), dataInicial.getUTCMonth() + quantidadeMeses, 1, 12));
  const ultimoDia = new Date(Date.UTC(resultado.getUTCFullYear(), resultado.getUTCMonth() + 1, 0)).getUTCDate();
  resultado.setUTCDate(Math.min(dia, ultimoDia));
  return resultado;
}

const PORT = process.env.PORT || 3000;

function hashConvite(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function sessao(usuario) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw Object.assign(new Error("JWT_SECRET não configurado"), { code: "JWT_NOT_CONFIGURED" });
  const token = jwt.sign({ id: usuario.id, email: usuario.email, tipo: usuario.tipo, empresaId: usuario.empresaId }, secret, { expiresIn: "8h" });
  return { token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo, empresaId: usuario.empresaId } };
}

// Cadastro da empreiteira e da primeira conta administradora.
app.post("/auth/registro-empreiteira", async (req, res) => {
  try {
    const corpo = req.body || {};
    const { empresa, nome, email, senha, cnpj, cpfResponsavel, telefone, telefoneSecundario, enderecoResponsavel, endereco } = corpo;
    if (![empresa, nome, email, senha, cnpj, cpfResponsavel, telefone, enderecoResponsavel, endereco].every((v) => typeof v === "string" && v.trim())) return res.status(400).json({ erro: "Preencha os dados da empresa, CNPJ, CPF, telefone, endereço pessoal, endereço da empresa e dados do administrador" });
    if (senha.length < 8) return res.status(400).json({ erro: "A senha deve ter pelo menos 8 caracteres" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ erro: "E-mail inválido" });
    if (!cnpjValido(cnpj)) return res.status(400).json({ erro: "CNPJ inválido: confira os 14 números e os dígitos verificadores" });
    if (!cpfValido(cpfResponsavel)) return res.status(400).json({ erro: "CPF inválido: confira os 11 números e os dígitos verificadores" });
    // Aceita os novos dados opcionais sem rejeitar clientes antigos da API.
    const camposOpcionaisEmpresa = {};
    // Define limites específicos para os campos novos do cadastro da empresa.
    const limitesCamposEmpresa = { slogan: 120, estado: 120, cidade: 120, bairro: 120, numero: 40, complemento: 240 };
    // Valida e normaliza somente os campos enviados pelo cliente.
    for (const [campo, limite] of Object.entries(limitesCamposEmpresa)) {
      // Mantém compatibilidade quando uma integração antiga omite o campo.
      if (corpo[campo] === undefined) continue;
      // Rejeita tipos incorretos e textos acima do limite documentado.
      if (typeof corpo[campo] !== "string" || corpo[campo].trim().length > limite) return res.status(400).json({ erro: `Campo ${campo} inválido` });
      // Converte texto vazio para nulo para não persistir espaços como conteúdo.
      camposOpcionaisEmpresa[campo] = corpo[campo].trim() || null;
    }
    // Mantém o número da empresa apenas com dígitos quando informado.
    if (camposOpcionaisEmpresa.numero && !/^\d+$/.test(camposOpcionaisEmpresa.numero)) return res.status(400).json({ erro: "O número do endereço da empresa deve conter apenas números" });
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ erro: "Banco não configurado" });
    const senhaHash = await bcrypt.hash(senha, 10);
    const usuario = await prisma.$transaction(async (tx) => {
      // Cria a empresa com os campos antigos e os novos dados opcionais.
      const criada = await tx.empresa.create({ data: { nome: empresa.trim(), cnpj: somenteDigitosCnpj(cnpj), cpfResponsavel: somenteDigitosCpf(cpfResponsavel), telefone: telefone.trim(), telefoneSecundario: telefoneSecundario?.trim() || null, enderecoResponsavel: enderecoResponsavel.trim(), endereco: endereco.trim(), ...camposOpcionaisEmpresa } });
      return tx.usuario.create({ data: { empresaId: criada.id, nome: nome.trim(), email: email.trim().toLowerCase(), senhaHash, tipo: "ADMIN", telefone: telefone.trim(), telefoneSecundario: telefoneSecundario?.trim() || null, endereco: enderecoResponsavel.trim() } });
    });
    return res.status(201).json(sessao(usuario));
  } catch (erro) {
    if (erro.code === "P2002") return res.status(409).json({ erro: "E-mail já cadastrado" });
    if (erro.code === "JWT_NOT_CONFIGURED") return res.status(503).json({ erro: "Autenticação não configurada" });
    console.error("Erro ao cadastrar empreiteira:", erro.code || erro.message);
    return res.status(500).json({ erro: "Não foi possível cadastrar a empreiteira" });
  }
});

// Mascara o e-mail no GET de convites de cliente para não expor o endereço completo.
function mascararEmailConvite(email) {
  // Mantém a string de origem para preservar domínio e caixa como foram cadastrados.
  const valor = String(email || "");
  // Localiza o último arroba para separar com segurança a parte local e o domínio.
  const indiceArroba = valor.lastIndexOf("@");
  // Devolve somente a máscara fixa se um registro legado não tiver domínio.
  if (indiceArroba < 0) return "******";
  // Separa a parte local sem incluir o arroba.
  const parteLocal = valor.slice(0, indiceArroba);
  // Conta letras da parte local como caracteres Unicode completos.
  const caracteresLocais = Array.from(parteLocal);
  // Preserva o domínio completo, mesmo quando não contém ponto.
  const dominio = valor.slice(indiceArroba + 1);
  // Define sempre seis asteriscos para não revelar o tamanho original.
  const asteriscos = "******";
  // Usa duas primeiras e duas últimas letras quando há seis caracteres locais ou mais.
  if (caracteresLocais.length >= 6) return `${caracteresLocais.slice(0, 2).join("")}${asteriscos}${caracteresLocais.slice(-2).join("")}@${dominio}`;
  // Mostra só a primeira letra para partes locais entre três e cinco caracteres.
  if (caracteresLocais.length >= 3) return `${caracteresLocais.slice(0, 1).join("")}${asteriscos}@${dominio}`;
  // Oculta por completo partes locais com um ou dois caracteres.
  return `${asteriscos}@${dominio}`;
}

app.get("/convites/:token", async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ erro: "Banco não configurado" });
    const convite = await prisma.convite.findUnique({ where: { tokenHash: hashConvite(req.params.token) }, include: { empresa: { select: { nome: true } }, obra: { select: { nome: true } } } });
    if (!convite) return res.status(404).json({ erro: "Convite não encontrado" });
    // Mantém o e-mail completo para gerente e fornece somente uma dica mascarada para cliente.
    const dadosEmail = convite.tipo === "CLIENTE" ? { emailDica: mascararEmailConvite(convite.email) } : { email: convite.email };
    // Retorna os dados públicos do convite sem revelar o e-mail de clientes.
    return res.json({ tipo: convite.tipo, nome: convite.nome, ...dadosEmail, empresa: convite.empresa.nome, obra: convite.obra?.nome || null, expirado: convite.expiraEm <= new Date(), usado: Boolean(convite.usadoEm) });
  } catch (erro) { return res.status(503).json({ erro: "Não foi possível consultar o convite" }); }
});

app.post("/convites/:token/aceitar", async (req, res) => {
  try {
    // Lê e-mail e senha sem exigir campos extras dos fluxos de gerente ou usuário logado.
    const { email, senha } = req.body || {};
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ erro: "Banco não configurado" });
    const tokenHash = hashConvite(req.params.token);
    const conviteAtual = await prisma.convite.findUnique({ where: { tokenHash } });
    if (!conviteAtual || conviteAtual.usadoEm || conviteAtual.expiraEm <= new Date()) return res.status(410).json({ erro: "Convite inválido, expirado ou já utilizado" });
    let usuarioSessao = null;
    const cabecalho = req.headers.authorization;
    if (cabecalho?.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(cabecalho.slice(7), process.env.JWT_SECRET, { algorithms: ["HS256"] });
        usuarioSessao = await prisma.usuario.findUnique({ where: { id: decoded.id } });
        if (!usuarioSessao || usuarioSessao.email !== decoded.email || usuarioSessao.empresaId !== decoded.empresaId || usuarioSessao.tipo !== decoded.tipo) usuarioSessao = null;
      } catch { usuarioSessao = null; }
    }
    // Exige a confirmação do e-mail somente de clientes que ainda não têm sessão válida.
    if (!usuarioSessao && conviteAtual.tipo === "CLIENTE") {
      // Normaliza o valor informado sem espaços externos e sem diferença entre maiúsculas e minúsculas.
      const emailInformado = typeof email === "string" ? email.trim().toLowerCase() : "";
      // Normaliza o endereço salvo no convite usando a mesma regra do valor informado.
      const emailConvidado = String(conviteAtual.email || "").trim().toLowerCase();
      // Identifica a falta de e-mail com um código claro antes de abrir a transação.
      if (!emailInformado) return res.status(400).json({ codigo: "EMAIL_CONVITE_OBRIGATORIO", erro: "Informe o e-mail do convite." });
      // Informa divergência sem revelar o endereço salvo no convite.
      if (emailInformado !== emailConvidado) return res.status(400).json({ codigo: "EMAIL_CONVITE_DIVERGENTE", erro: "O e-mail informado não confere com o do convite. Confira o endereço e tente novamente." });
    }
    // Exige as regras de senha somente quando o convite realmente cria uma conta.
    if (!usuarioSessao) {
      // Executa as mesmas regras para convites de cliente e gerente sem sessão.
      const validacaoSenha = validarSenhaConvite(senha);
      // Retorna erro próprio sem iniciar a transação quando a senha for inválida.
      if (!validacaoSenha.valida) return res.status(400).json({ codigo: validacaoSenha.codigo, erro: validacaoSenha.erro });
    }
    const senhaHash = usuarioSessao ? null : await bcrypt.hash(senha, 10);
    const usuario = await prisma.$transaction(async (tx) => {
      const convite = await tx.convite.findFirst({ where: { id: conviteAtual.id, usadoEm: null, expiraEm: { gt: new Date() } } });
      if (!convite) throw Object.assign(new Error("Convite já utilizado"), { code: "INVITE_USED" });
      const reivindicado = await tx.convite.updateMany({
        where: { id: convite.id, usadoEm: null, expiraEm: { gt: new Date() } },
        data: { usadoEm: new Date() },
      });
      if (reivindicado.count !== 1) throw Object.assign(new Error("Convite já utilizado"), { code: "INVITE_USED" });
      const tipoUsuario = convite.tipo === "CLIENTE" ? "CLIENTE" : "COLABORADOR";
      let novo = await tx.usuario.findUnique({ where: { email: convite.email } });
      if (novo) {
        if (!usuarioSessao || usuarioSessao.id !== novo.id || novo.empresaId !== convite.empresaId || novo.tipo !== tipoUsuario) throw Object.assign(new Error("Entre com a conta deste e-mail antes de aceitar o convite."), { code: "EMAIL_EXISTS" });
      } else {
        if (usuarioSessao) throw Object.assign(new Error("O convite foi enviado para outro e-mail. Saia da conta atual e use o e-mail convidado."), { code: "ACCOUNT_MISMATCH" });
        novo = await tx.usuario.create({ data: { empresaId: convite.empresaId, nome: convite.nome, email: convite.email, senhaHash, tipo: tipoUsuario, telefone: convite.telefone, endereco: convite.endereco, estado: convite.estado, cidade: convite.cidade, bairro: convite.bairro, numero: convite.numero, apartamento: convite.apartamento, bloco: convite.bloco, semApartamento: convite.semApartamento, semBloco: convite.semBloco } });
      }
      if (usuarioSessao && (convite.telefone || convite.endereco || convite.estado || convite.cidade || convite.bairro || convite.numero)) {
        novo = await tx.usuario.update({ where: { id: novo.id }, data: { ...(convite.telefone ? { telefone: convite.telefone } : {}), ...(convite.endereco ? { endereco: convite.endereco } : {}), ...(convite.estado ? { estado: convite.estado } : {}), ...(convite.cidade ? { cidade: convite.cidade } : {}), ...(convite.bairro ? { bairro: convite.bairro } : {}), ...(convite.numero ? { numero: convite.numero } : {}), ...(convite.tipo === "CLIENTE" ? { apartamento: convite.apartamento, bloco: convite.bloco, semApartamento: convite.semApartamento, semBloco: convite.semBloco } : {}) } });
      }
      if (convite.tipo === "CLIENTE") {
        if (convite.obraId) {
          const vinculada = await tx.obra.updateMany({ where: { id: convite.obraId, empresaId: convite.empresaId, clienteId: null }, data: { clienteId: novo.id } });
          const obra = await tx.obra.findFirst({ where: { id: convite.obraId, empresaId: convite.empresaId }, select: { id: true, clienteId: true, valorBase: true, valorTotal: true, quantidadeParcelas: true } });
          if (!obra || (obra.clienteId !== novo.id && vinculada.count === 0)) throw Object.assign(new Error("A obra já está vinculada a outro cliente."), { code: "WORK_ALREADY_LINKED" });
          if (convite.quantidadeParcelas && convite.vencimentoInicial) {
            const parcelasAtuais = await tx.parcela.findMany({ where: { obraId: convite.obraId }, include: { pagamentos: { select: { id: true } } }, orderBy: { numero: "asc" } });
            if (parcelasAtuais.some((parcela) => parcela.situacao === "PAGA" || parcela.pagamentos.length)) throw Object.assign(new Error("Não é possível alterar parcelas depois de iniciar pagamentos."), { code: "INSTALLMENTS_LOCKED" });
            const quantidade = convite.quantidadeParcelas;
            if (parcelasAtuais.length > quantidade) throw Object.assign(new Error("Não é possível reduzir a quantidade de parcelas já cadastradas."), { code: "INSTALLMENTS_LOCKED" });
            const taxa = quantidade > 12 ? 1 : 0;
            const base = Number(obra.valorBase || obra.valorTotal);
            const total = Math.round(base * (1 + (taxa / 100) * Math.max(0, quantidade - 12)) * 100) / 100;
            const valores = Array.from({ length: quantidade }, (_, indice) => Math.round((total / quantidade) * 100) / 100);
            valores[valores.length - 1] = Math.round((total - valores.slice(0, -1).reduce((soma, item) => soma + item, 0)) * 100) / 100;
            await tx.obra.update({ where: { id: obra.id }, data: { valorBase: base.toFixed(2), valorTotal: total.toFixed(2), quantidadeParcelas: quantidade, taxaJurosMensal: taxa } });
            for (let indice = 0; indice < quantidade; indice += 1) {
              const vencimento = somarMesesPreservandoDia(new Date(convite.vencimentoInicial), indice);
              const parcela = parcelasAtuais[indice];
              if (parcela) await tx.parcela.update({ where: { id: parcela.id }, data: { numero: indice + 101, valor: valores[indice].toFixed(2), vencimento } });
              else await tx.parcela.create({ data: { obraId: obra.id, numero: indice + 101, valor: valores[indice].toFixed(2), vencimento } });
            }
            for (let indice = 0; indice < quantidade; indice += 1) {
              await tx.parcela.updateMany({ where: { obraId: obra.id, numero: indice + 101 }, data: { numero: indice + 1 } });
            }
          } else if (convite.vencimentoInicial) {
            // Convites novos mantêm quantidade e total que já foram definidos na obra.
            const parcelasAtuais = await tx.parcela.findMany({ where: { obraId: convite.obraId }, include: { pagamentos: { select: { id: true } } }, orderBy: { numero: "asc" } });
            // Datas de vencimento não podem ser alteradas depois do início de pagamentos.
            if (parcelasAtuais.some((parcela) => parcela.situacao === "PAGA" || parcela.pagamentos.length)) throw Object.assign(new Error("Não é possível alterar parcelas depois de iniciar pagamentos."), { code: "INSTALLMENTS_LOCKED" });
            // Usa os campos persistidos na obra, sem recalcular a cobrança ou a quantidade.
            const quantidade = Number(obra.quantidadeParcelas || parcelasAtuais.length);
            const total = Number(obra.valorTotal);
            if (!Number.isInteger(quantidade) || quantidade < 1 || !Number.isFinite(total) || total <= 0) throw Object.assign(new Error("A obra precisa ter quantidade de parcelas e valor total válidos."), { code: "INSTALLMENTS_LOCKED" });
            // Não apaga parcelas existentes caso a obra tenha dados inconsistentes.
            if (parcelasAtuais.length > quantidade) throw Object.assign(new Error("A obra tem mais parcelas cadastradas do que a quantidade definida."), { code: "INSTALLMENTS_LOCKED" });
            // Divide o total já calculado pela obra e ajusta o último centavo.
            const valores = Array.from({ length: quantidade }, () => Math.round((total / quantidade) * 100) / 100);
            valores[valores.length - 1] = Math.round((total - valores.slice(0, -1).reduce((soma, item) => soma + item, 0)) * 100) / 100;
            // Atualiza ou completa parcelas usando o vencimento informado no convite.
            for (let indice = 0; indice < quantidade; indice += 1) {
              const vencimento = somarMesesPreservandoDia(new Date(convite.vencimentoInicial), indice);
              const parcela = parcelasAtuais[indice];
              if (parcela) await tx.parcela.update({ where: { id: parcela.id }, data: { numero: indice + 101, valor: valores[indice].toFixed(2), vencimento } });
              else await tx.parcela.create({ data: { obraId: obra.id, numero: indice + 101, valor: valores[indice].toFixed(2), vencimento } });
            }
            // Restaura a numeração sequencial depois da atualização sem colisões.
            for (let indice = 0; indice < quantidade; indice += 1) {
              await tx.parcela.updateMany({ where: { obraId: obra.id, numero: indice + 101 }, data: { numero: indice + 1 } });
            }
          }
          // O contrato do cliente deve ser salvo nos convites novos e nos legados.
          if (convite.contratoUrl) await tx.contrato.upsert({ where: { obraId: obra.id }, create: { obraId: obra.id, empresaId: convite.empresaId, termos: "Contrato anexado ao cadastrar o cliente.", arquivoUrl: convite.contratoUrl }, update: { termos: "Contrato anexado ao cadastrar o cliente.", arquivoUrl: convite.contratoUrl } });
          const evento = await tx.obraEvento.create({ data: { obraId: convite.obraId, empresaId: convite.empresaId, usuarioId: novo.id, tipo: "STATUS", descricao: `${novo.nome} aceitou o convite de cliente e vinculou-se à obra.`, visivelParaCliente: false } });
          const administradores = await tx.usuario.findMany({ where: { empresaId: convite.empresaId, tipo: "ADMIN" }, select: { id: true } });
          if (administradores.length) await tx.notificacao.createMany({ data: administradores.map(({ id }) => ({ empresaId: convite.empresaId, usuarioId: id, obraId: convite.obraId, eventoId: evento.id, tipo: "CONVITE", titulo: "Cliente aceitou o convite", descricao: `${novo.nome} aceitou o convite para acompanhar a obra.` })) });
        }
      } else {
        let funcionario = await tx.funcionario.findUnique({ where: { usuarioId: novo.id } });
        if (!funcionario) funcionario = await tx.funcionario.create({ data: { empresaId: convite.empresaId, nome: convite.nome, funcao: convite.funcao || "Gerente de obras", nivel: "RESPONSAVEL", telefone: convite.telefone, usuarioId: novo.id } });
        else if (convite.telefone) await tx.funcionario.update({ where: { id: funcionario.id }, data: { telefone: convite.telefone } });
        if (funcionario.empresaId !== convite.empresaId || !funcionario.ativo || funcionario.nivel !== "RESPONSAVEL") throw Object.assign(new Error("A conta existente não pode receber acesso de gerente."), { code: "MANAGER_PROFILE_INVALID" });
        const escalaAberta = await tx.obraEscala.findFirst({ where: { obraId: convite.obraId, funcionarioId: funcionario.id, dataFim: null } });
        if (!escalaAberta) {
          await tx.obraEscala.create({ data: { obraId: convite.obraId, funcionarioId: funcionario.id, alteradoPorId: convite.criadoPorId, motivo: "Convite de gerente aceito" } });
          const evento = await tx.obraEvento.create({ data: { obraId: convite.obraId, empresaId: convite.empresaId, usuarioId: convite.criadoPorId, tipo: "EQUIPE", descricao: `${convite.nome} recebeu acesso de gerente à obra.`, visivelParaCliente: false } });
          await tx.notificacao.create({ data: { empresaId: convite.empresaId, usuarioId: novo.id, obraId: convite.obraId, eventoId: evento.id, tipo: "EQUIPE", titulo: "Você recebeu acesso a uma obra", descricao: "A empreiteira atribuiu uma obra à sua conta." } });
          const administradores = await tx.usuario.findMany({ where: { empresaId: convite.empresaId, tipo: "ADMIN" }, select: { id: true } });
          if (administradores.length) await tx.notificacao.createMany({ data: administradores.map(({ id }) => ({ empresaId: convite.empresaId, usuarioId: id, obraId: convite.obraId, eventoId: evento.id, tipo: "CONVITE", titulo: "Gerente aceitou o convite", descricao: `${convite.nome} aceitou o convite de gerente da obra.` })) });
        }
      }
      return novo;
    });
    return res.json(sessao(usuario));
  } catch (erro) {
    if (erro.code === "EMAIL_EXISTS") return res.status(409).json({ erro: erro.message });
    if (["ACCOUNT_MISMATCH", "WORK_ALREADY_LINKED", "MANAGER_PROFILE_INVALID", "INSTALLMENTS_LOCKED"].includes(erro.code)) return res.status(409).json({ erro: erro.message });
    if (erro.code === "INVITE_USED") return res.status(410).json({ erro: "Convite já utilizado" });
    if (erro.code === "P2034") return res.status(409).json({ erro: "O convite foi aceito por outra solicitação; atualize a página" });
    console.error("Erro ao aceitar convite:", erro.code || erro.message);
    return res.status(500).json({ erro: "Não foi possível aceitar o convite" });
  }
});

async function criarConvite(req, res, tipo) {
  try {
    const { obraId, nome, email, funcao, telefone, endereco, estado, cidade, bairro, numero, apartamento, bloco, semApartamento, semBloco, quantidadeParcelas, vencimentoInicial, contrato } = req.body || {};
    // Mantém quantidade opcional para aceitar integrações e convites legados.
    const quantidadeLegadaInformada = quantidadeParcelas !== undefined && quantidadeParcelas !== null && quantidadeParcelas !== "";
    const obraIdInformada = typeof obraId === "string" && obraId.trim() ? obraId.trim() : null;
    if (![nome, email, telefone].every((v) => typeof v === "string" && v.trim()) || !obraIdInformada || (tipo === "GERENTE" && (typeof funcao !== "string" || !funcao.trim())) || (tipo === "CLIENTE" && (typeof endereco !== "string" || !endereco.trim()))) return res.status(400).json({ erro: tipo === "GERENTE" ? "Obra, nome, e-mail, telefone e função são obrigatórios" : "Obra, nome, e-mail, telefone e endereço são obrigatórios" });
    if (tipo === "CLIENTE" && (![estado, cidade, bairro, endereco, numero].every((v) => typeof v === "string" && v.trim()) || !/^\d+$/.test(String(numero || "").trim()) || typeof semApartamento !== "boolean" || typeof semBloco !== "boolean" || (!semApartamento && (typeof apartamento !== "string" || !/^\d+$/.test(apartamento.trim()))) || (!semBloco && (typeof bloco !== "string" || !/^[A-Za-z0-9]+$/.test(bloco.trim()))))) return res.status(400).json({ erro: "Preencha estado, cidade, bairro, rua, número e informe apartamento e bloco ou marque que não existem" });
    if (tipo === "CLIENTE" && ((quantidadeLegadaInformada && (!Number.isInteger(Number(quantidadeParcelas)) || Number(quantidadeParcelas) < 1 || Number(quantidadeParcelas) > 36)) || !/^\d{4}-\d{2}-\d{2}$/.test(vencimentoInicial || "") || typeof contrato?.data !== "string" || contrato.mimeType !== "application/pdf")) return res.status(400).json({ erro: "Selecione o contrato PDF e a data do primeiro vencimento; a quantidade legada, se enviada, deve estar entre 1 e 36" });
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ erro: "Banco não configurado" });
    const obra = await prisma.obra.findFirst({ where: { id: obraIdInformada, empresaId: req.usuario.empresaId, excluidaEm: null } });
    if (!obra) return res.status(404).json({ erro: "Obra não encontrada" });
    if (tipo === "CLIENTE" && obra?.clienteId) return res.status(409).json({ erro: "Esta obra já está vinculada a um cliente" });
    if (tipo === "CLIENTE") {
      const pagamentos = await prisma.pagamento.count({ where: { obraId: obra.id } });
      const pagas = await prisma.parcela.count({ where: { obraId: obra.id, situacao: "PAGA" } });
      if (pagamentos || pagas) return res.status(409).json({ erro: "Só é possível vincular cliente e definir parcelas antes de iniciar pagamentos" });
    }
    if (tipo === "GERENTE" && (!obraIdInformada || !funcao?.trim())) return res.status(400).json({ erro: "Selecione a obra e informe a função" });
    const normalizedEmail = email.trim().toLowerCase();
    let contratoUrl = null;
    let vencimento = null;
    if (tipo === "CLIENTE") {
      const dataComHora = new Date(`${vencimentoInicial}T12:00:00.000Z`);
      if (!Number.isFinite(dataComHora.getTime()) || dataComHora.toISOString().slice(0, 10) !== vencimentoInicial) return res.status(400).json({ erro: "Data do primeiro vencimento inválida" });
      vencimento = dataComHora;
      contratoUrl = await cloudinaryService.enviarContratoObra({ arquivo: contrato, obraId: obra.id });
    }
    const rawToken = crypto.randomBytes(32).toString("base64url");
    const convite = await prisma.convite.create({ data: { empresaId: req.usuario.empresaId, obraId: obra.id, criadoPorId: req.usuario.id, tipo, nome: nome.trim(), email: normalizedEmail, telefone: telefone.trim(), endereco: tipo === "CLIENTE" ? endereco.trim() : null, estado: tipo === "CLIENTE" ? estado.trim() : null, cidade: tipo === "CLIENTE" ? cidade.trim() : null, bairro: tipo === "CLIENTE" ? bairro.trim() : null, numero: tipo === "CLIENTE" ? numero.trim() : null, apartamento: tipo === "CLIENTE" && !semApartamento ? apartamento.trim() : null, bloco: tipo === "CLIENTE" && !semBloco ? bloco.trim() : null, semApartamento: tipo === "CLIENTE" ? semApartamento : null, semBloco: tipo === "CLIENTE" ? semBloco : null, funcao: tipo === "GERENTE" ? funcao.trim() : null, quantidadeParcelas: tipo === "CLIENTE" && quantidadeLegadaInformada ? Number(quantidadeParcelas) : null, vencimentoInicial: vencimento, contratoUrl, tokenHash: hashConvite(rawToken), expiraEm: new Date(Date.now() + 48 * 60 * 60 * 1000) } });
    const base = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.status(201).json({ convite: { id: convite.id, email: convite.email, expiraEm: convite.expiraEm, link: `${base.replace(/\/$/, "")}/convite/${rawToken}` } });
  } catch (erro) {
    if (erro.code === "CLOUDINARY_NAO_CONFIGURADO") return res.status(503).json({ erro: "Upload indisponível. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no backend e tente novamente." });
    if (["CONTRATO_INVALIDO", "CLOUDINARY_FALHA", "CLOUDINARY_INDISPONIVEL", "CLOUDINARY_RESPOSTA_INVALIDA"].includes(erro.code)) return res.status(400).json({ erro: erro.message });
    console.error("Erro ao criar convite:", erro.code || erro.message);
    return res.status(500).json({ erro: "Não foi possível criar o convite" });
  }
}

app.post("/convites/cliente", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), (req, res) => criarConvite(req, res, "CLIENTE"));
app.post("/convites/gerente", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), (req, res) => criarConvite(req, res, "GERENTE"));

app.get("/convites", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ erro: "Banco não configurado" });
    const convites = await prisma.$queryRaw(Prisma.sql`
      SELECT (to_jsonb(convite) - 'tokenHash') || jsonb_build_object(
        'obra', CASE WHEN obra.id IS NULL THEN NULL ELSE jsonb_build_object('id', obra.id, 'nome', obra.nome) END
      ) AS convite
      FROM "Convite" convite
      LEFT JOIN "Obra" obra ON obra.id = convite."obraId"
      WHERE convite."empresaId" = ${req.usuario.empresaId}
      ORDER BY convite."criadoEm" DESC
    `);
    return res.json(convites.map(({ convite }) => convite));
  } catch (erro) {
    console.error("Erro ao listar convites:", erro.code || erro.message);
    return res.status(500).json({ erro: "Erro ao listar convites" });
  }
});

app.delete("/convites/:id", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const prisma = getPrisma();
    const convite = await prisma.convite.findFirst({ where: { id: req.params.id, empresaId: req.usuario.empresaId }, select: { id: true, usadoEm: true, expiraEm: true } });
    if (!convite) return res.status(404).json({ erro: "Convite não encontrado" });
    if (convite.usadoEm || convite.expiraEm > new Date()) return res.status(409).json({ erro: "Só convites expirados e não utilizados podem ser excluídos" });
    await prisma.convite.deleteMany({ where: { id: convite.id, empresaId: req.usuario.empresaId, usadoEm: null, expiraEm: { lte: new Date() } } });
    return res.json({ mensagem: "Convite expirado excluído" });
  } catch (erro) { console.error("Erro ao excluir convite expirado:", erro.code || erro.message); return res.status(500).json({ erro: "Não foi possível excluir o convite" }); }
});

app.post("/convites/:id/reenviar", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ erro: "Banco não configurado" });
    const convite = await prisma.convite.findFirst({ where: { id: req.params.id, empresaId: req.usuario.empresaId, usadoEm: null } });
    if (!convite) return res.status(404).json({ erro: "Convite pendente não encontrado" });
    const rawToken = crypto.randomBytes(32).toString("base64url");
    const expiraEm = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const atualizado = await prisma.convite.updateMany({
      where: { id: convite.id, empresaId: req.usuario.empresaId, usadoEm: null },
      data: { tokenHash: hashConvite(rawToken), expiraEm },
    });
    if (atualizado.count !== 1) return res.status(409).json({ erro: "O convite já foi aceito; atualize a lista" });
    const base = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.json({ convite: { id: convite.id, email: convite.email, expiraEm, link: `${base.replace(/\/$/, "")}/convite/${rawToken}` } });
  } catch (erro) {
    console.error("Erro ao gerar novo link de convite:", erro.code || erro.message);
    return res.status(500).json({ erro: "Não foi possível gerar um novo link" });
  }
});

app.get("/tabela-precos", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ erro: "Banco não configurado" });
    const precos = await prisma.tabelaPreco.findMany({ where: { empresaId: req.usuario.empresaId }, orderBy: [{ ativo: "desc" }, { servico: "asc" }] });
    return res.json(precos.map((item) => ({ ...item, valor: Number(item.valor) })));
  } catch (erro) { console.error("Erro ao consultar tabela de preços:", erro.code || erro.message); return res.status(500).json({ erro: "Erro ao consultar tabela de preços" }); }
});

app.get("/tabela-precos/cliente", authMiddleware, exigirEmpresaDoToken, exigirPapel("CLIENTE"), async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ erro: "Banco não configurado" });
    const precos = await prisma.tabelaPreco.findMany({ where: { empresaId: req.usuario.empresaId, ativo: true }, select: { id: true, servico: true, unidade: true, valor: true }, orderBy: { servico: "asc" } });
    return res.json(precos.map((item) => ({ ...item, valor: Number(item.valor) })));
  } catch (erro) { console.error("Erro ao consultar preços do cliente:", erro.code || erro.message); return res.status(500).json({ erro: "Não foi possível consultar a tabela de preços" }); }
});

app.post("/tabela-precos", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const { servico, unidade, valor } = req.body || {};
    if (typeof servico !== "string" || !servico.trim() || servico.trim().length > 120 || typeof unidade !== "string" || !unidade.trim() || unidade.trim().length > 30) return res.status(400).json({ erro: "Serviço e unidade são obrigatórios (até 120 e 30 caracteres)" });
    const normalizado = String(valor ?? "");
    if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(normalizado) || Number(normalizado) <= 0) return res.status(400).json({ erro: "O preço deve ser positivo e ter até duas casas decimais" });
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ erro: "Banco não configurado" });
    const preco = await prisma.tabelaPreco.create({ data: { empresaId: req.usuario.empresaId, servico: servico.trim(), unidade: unidade.trim(), valor: normalizado } });
    return res.status(201).json({ preco: { ...preco, valor: Number(preco.valor) } });
  } catch (erro) { console.error("Erro ao criar preço:", erro.code || erro.message); return res.status(500).json({ erro: "Erro ao criar preço" }); }
});

app.patch("/tabela-precos/:id", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const dados = {};
    for (const campo of ["servico", "unidade"]) {
      if (req.body?.[campo] !== undefined) {
        if (typeof req.body[campo] !== "string" || !req.body[campo].trim() || req.body[campo].trim().length > (campo === "servico" ? 120 : 30)) return res.status(400).json({ erro: `Campo ${campo} inválido` });
        dados[campo] = req.body[campo].trim();
      }
    }
    if (req.body?.valor !== undefined) {
      const normalizado = String(req.body.valor);
      if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(normalizado) || Number(normalizado) <= 0) return res.status(400).json({ erro: "O preço deve ser positivo e ter até duas casas decimais" });
      dados.valor = normalizado;
    }
    if (req.body?.ativo !== undefined) {
      if (typeof req.body.ativo !== "boolean") return res.status(400).json({ erro: "ativo deve ser booleano" });
      dados.ativo = req.body.ativo;
    }
    if (Object.keys(dados).length === 0) return res.status(400).json({ erro: "Informe dados para atualizar" });
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ erro: "Banco não configurado" });
    const resultado = await prisma.tabelaPreco.updateMany({ where: { id: req.params.id, empresaId: req.usuario.empresaId }, data: dados });
    if (resultado.count !== 1) return res.status(404).json({ erro: "Preço não encontrado" });
    const preco = await prisma.tabelaPreco.findFirst({ where: { id: req.params.id, empresaId: req.usuario.empresaId } });
    return res.json({ preco: { ...preco, valor: Number(preco.valor) } });
  } catch (erro) { console.error("Erro ao atualizar preço:", erro.code || erro.message); return res.status(500).json({ erro: "Erro ao atualizar preço" }); }
});

app.delete("/tabela-precos/:id", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const resultado = await getPrisma().tabelaPreco.deleteMany({ where: { id: req.params.id, empresaId: req.usuario.empresaId } });
    if (resultado.count !== 1) return res.status(404).json({ erro: "Preço não encontrado" });
    return res.json({ mensagem: "Preço excluído" });
  } catch (erro) { console.error("Erro ao excluir preço:", erro.code || erro.message); return res.status(500).json({ erro: "Não foi possível excluir o preço" }); }
});

app.get("/calendario", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ erro: "Banco não configurado" });
    const obras = await prisma.obra.findMany({
      where: { empresaId: req.usuario.empresaId, excluidaEm: null, agendadaPara: { not: null } },
      select: { id: true, nome: true, status: true, agendadaPara: true, prazoFinal: true, cliente: { select: { nome: true } } },
      orderBy: { agendadaPara: "asc" },
    });
    return res.json(obras.map((obra) => ({
      ...obra,
      agendadaPara: obra.agendadaPara?.toISOString().slice(0, 10) || null,
      prazoFinal: obra.prazoFinal?.toISOString().slice(0, 10) || null,
    })));
  } catch (erro) { console.error("Erro ao consultar calendário:", erro.code || erro.message); return res.status(500).json({ erro: "Erro ao consultar calendário" }); }
});

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

    guardarSessao(usuario);

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
    const { empresa, ...dadosUsuario } = usuario;
    return res.json({ mensagem: "Acesso autorizado", usuario: usuario.tipo === "ADMIN" ? { ...dadosUsuario, empresa } : dadosUsuario });
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") {
      return res.status(503).json({ erro: erro.message });
    }
    console.error("Erro ao consultar usuário autenticado:", erro.message);
    return res.status(500).json({ erro: "Erro ao consultar usuário autenticado" });
  }
});

app.patch("/usuarios/me", authMiddleware, async (req, res) => {
  try {
    const corpo = req.body || {};
    const dados = {};
    if (corpo.email !== undefined) {
      if (typeof corpo.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(corpo.email.trim())) return res.status(400).json({ erro: "Informe um e-mail válido" });
      dados.email = corpo.email.trim().toLowerCase();
    }
    for (const campo of ["telefone", "telefoneSecundario", "endereco", "estado", "cidade", "bairro", "numero", "complemento", "apartamento", "bloco"]) {
      if (corpo[campo] !== undefined) {
        const limite = campo === "endereco" || campo === "complemento" ? 240 : campo === "telefone" || campo === "telefoneSecundario" ? 40 : 120;
        if (typeof corpo[campo] !== "string" || corpo[campo].trim().length > limite) return res.status(400).json({ erro: campo === "endereco" ? "Endereço inválido (até 240 caracteres)" : "Telefone inválido" });
        dados[campo] = corpo[campo].trim() || null;
      }
    }
    for (const campo of ["semApartamento", "semBloco"]) {
      if (corpo[campo] !== undefined) {
        if (typeof corpo[campo] !== "boolean") return res.status(400).json({ erro: `${campo} deve ser booleano` });
        dados[campo] = corpo[campo];
      }
    }
    if (req.usuario.tipo === "CLIENTE") {
      const obrigatorios = ["estado", "cidade", "bairro", "endereco", "numero"];
      if (obrigatorios.some((campo) => corpo[campo] !== undefined && (typeof corpo[campo] !== "string" || !corpo[campo].trim()))) return res.status(400).json({ erro: "Estado, cidade, bairro, rua e número são obrigatórios" });
      if (dados.numero && !/^\d+$/.test(dados.numero)) return res.status(400).json({ erro: "O número do endereço deve conter apenas números" });
      if (corpo.semApartamento === false && (!dados.apartamento || !/^\d+$/.test(dados.apartamento))) return res.status(400).json({ erro: "Informe o apartamento ou marque que não existe" });
      if (corpo.semBloco === false && (!dados.bloco || !/^[A-Za-z0-9]+$/.test(dados.bloco))) return res.status(400).json({ erro: "Informe o bloco ou marque que não existe" });
      if (corpo.semApartamento === true) dados.apartamento = null;
      if (corpo.semBloco === true) dados.bloco = null;
    }
    let empresaDados = null;
    if (corpo.empresa !== undefined) {
      if (req.usuario.tipo !== "ADMIN" || !corpo.empresa || typeof corpo.empresa !== "object") return res.status(403).json({ erro: "Somente o administrador pode atualizar os dados da empresa" });
      empresaDados = {};
      // Permite que o administrador atualize o slogan e os dados já editáveis da empresa.
      for (const campo of ["slogan", "endereco", "estado", "cidade", "bairro", "numero", "complemento", "telefone", "telefoneSecundario", "enderecoResponsavel"]) {
        if (corpo.empresa[campo] === undefined) continue;
        // Mantém o slogan mais curto e preserva o limite anterior para os demais campos.
        const limite = campo === "slogan" ? 120 : 240;
        if (typeof corpo.empresa[campo] !== "string" || corpo.empresa[campo].trim().length > limite) return res.status(400).json({ erro: `Campo ${campo} inválido` });
        empresaDados[campo] = corpo.empresa[campo].trim() || null;
      }
      if (!Object.keys(empresaDados).length) empresaDados = null;
    }
    if (corpo.cpf !== undefined) {
      if (typeof corpo.cpf !== "string" || (corpo.cpf.trim() && !cpfValido(corpo.cpf))) return res.status(400).json({ erro: "Informe um CPF válido" });
      dados.cpf = corpo.cpf.trim() ? somenteDigitosCpf(corpo.cpf) : null;
    }
    if (corpo.foto !== undefined) dados.fotoUrl = await cloudinaryService.enviarFotoObra({ foto: corpo.foto, obraId: req.usuario.id });
    if (!Object.keys(dados).length && !empresaDados) return res.status(400).json({ erro: "Informe dados de contato, endereço, CPF, foto ou empresa para atualizar" });
    const prisma = getPrisma();
    const [usuario] = await Promise.all([
      prisma.usuario.update({ where: { id: req.usuario.id }, data: dados, select: { id: true, empresaId: true, nome: true, email: true, tipo: true, telefone: true, telefoneSecundario: true, fotoUrl: true, endereco: true, estado: true, cidade: true, bairro: true, numero: true, complemento: true, apartamento: true, bloco: true, semApartamento: true, semBloco: true, cpf: true, funcionario: { select: { funcao: true, telefone: true, fotoUrl: true } } } }),
      empresaDados ? prisma.empresa.update({ where: { id: req.usuario.empresaId }, data: empresaDados }) : Promise.resolve(null),
    ]);
    if (empresaDados) usuario.empresa = empresaDados;
    if (dados.email !== undefined) invalidarSessaoUsuario(usuario.id);
    return res.json({ ...sessao(usuario), usuario, mensagem: "Perfil atualizado" });
  } catch (erro) {
    if (erro.code === "P2002") return res.status(409).json({ erro: "Este e-mail já está cadastrado" });
    if (erro.code === "FOTO_INVALIDA") return res.status(400).json({ erro: erro.message });
    if (erro.code?.startsWith("CLOUDINARY")) return res.status(503).json({ erro: erro.message });
    console.error("Erro ao atualizar perfil:", erro.code || erro.message);
    return res.status(500).json({ erro: "Não foi possível atualizar o perfil" });
  }
});

app.get("/notificacoes", authMiddleware, exigirEmpresaDoToken, async (req, res) => {
  try {
    const obraId = typeof req.query.obraId === "string" ? req.query.obraId : "";
    const cacheKey = `notificacoes:${req.usuario.id}:${obraId}`;
    const notificacoes = await comCacheEmpresa(req.usuario.empresaId, cacheKey, () => {
      const filtroObra = obraId ? Prisma.sql`AND notificacao."obraId" = ${obraId}` : Prisma.empty;
      return getPrisma().$queryRaw(Prisma.sql`
        SELECT notificacao.*,
          CASE WHEN obra.id IS NULL THEN NULL ELSE jsonb_build_object('id', obra.id, 'nome', obra.nome) END AS obra
        FROM "Notificacao" notificacao
        LEFT JOIN "Obra" obra ON obra.id = notificacao."obraId"
        WHERE notificacao."empresaId" = ${req.usuario.empresaId}
          AND notificacao."usuarioId" = ${req.usuario.id}
          ${filtroObra}
        ORDER BY notificacao."lidaEm" ASC, notificacao."criadoEm" DESC`);
    });
    return res.json(notificacoes);
  } catch (erro) { console.error("Erro ao listar notificações:", erro.code || erro.message); return res.status(500).json({ erro: "Não foi possível carregar as notificações" }); }
});

app.patch("/notificacoes/:id/lida", authMiddleware, exigirEmpresaDoToken, async (req, res) => {
  try {
    const resultado = await getPrisma().notificacao.updateMany({ where: { id: req.params.id, empresaId: req.usuario.empresaId, usuarioId: req.usuario.id }, data: { lidaEm: new Date() } });
    if (!resultado.count) return res.status(404).json({ erro: "Notificação não encontrada" });
    return res.json({ mensagem: "Notificação marcada como lida" });
  } catch (erro) { console.error("Erro ao marcar notificação:", erro.code || erro.message); return res.status(500).json({ erro: "Não foi possível atualizar a notificação" }); }
});

app.delete("/notificacoes/:id", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const resultado = await getPrisma().notificacao.deleteMany({ where: { id: req.params.id, empresaId: req.usuario.empresaId } });
    if (!resultado.count) return res.status(404).json({ erro: "Notificação não encontrada" });
    return res.json({ mensagem: "Notificação removida" });
  } catch (erro) { console.error("Erro ao remover notificação:", erro.code || erro.message); return res.status(500).json({ erro: "Não foi possível remover a notificação" }); }
});

app.get("/pagamentos", authMiddleware, exigirEmpresaDoToken, async (req, res) => {
  try {
    const prisma = getPrisma();
    if (req.usuario.tipo === "COLABORADOR") return res.status(403).json({ erro: "Acesso a pagamentos não permitido" });
    const obras = await prisma.$queryRaw(Prisma.sql`
      SELECT obra.id, obra.nome, obra."valorTotal",
        EXISTS (
          SELECT 1 FROM "Convite" convite
          WHERE convite."obraId" = obra.id AND convite.tipo = 'CLIENTE'
            AND convite."usadoEm" IS NULL AND convite."expiraEm" > ${new Date()}
        ) AS "conviteClientePendente",
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', parcela.id, 'numero', parcela.numero, 'valor', parcela.valor,
              'situacao', parcela.situacao, 'vencimento', parcela.vencimento,
              'comprovanteUrl', parcela."comprovanteUrl", 'comprovanteEnviadoEm', parcela."comprovanteEnviadoEm",
              'pagamentos', COALESCE((
                SELECT jsonb_agg(jsonb_build_object('id', pagamento.id, 'valor', pagamento.valor::text, 'status', pagamento.status))
                FROM "Pagamento" pagamento WHERE pagamento."parcelaId" = parcela.id
              ), '[]'::jsonb)
            ) ORDER BY parcela.numero ASC
          )
          FROM "Parcela" parcela WHERE parcela."obraId" = obra.id
        ), '[]'::jsonb) AS parcelas
      FROM "Obra" obra
      WHERE obra."empresaId" = ${req.usuario.empresaId} AND obra."excluidaEm" IS NULL
        AND (${req.usuario.tipo !== "CLIENTE"} OR obra."clienteId" = ${req.usuario.id})
      ORDER BY obra."criadoEm" DESC
    `);
    return res.json(obras.map((obra) => ({
      id: obra.id,
      nome: obra.nome,
      valorTotal: Number(obra.valorTotal),
      conviteClientePendente: obra.conviteClientePendente,
      parcelas: obra.parcelas.map((parcela) => ({ ...parcela, valor: Number(parcela.valor) })),
    })));
  } catch (erro) { console.error("Erro ao listar pagamentos:", erro.code || erro.message); return res.status(500).json({ erro: "Não foi possível carregar os pagamentos" }); }
});

app.post("/obras/:id/parcelas/:parcelaId/comprovante", authMiddleware, exigirEmpresaDoToken, exigirPapel("CLIENTE"), async (req, res) => {
  try {
    const prisma = getPrisma();
    const obra = await prisma.obra.findFirst({ where: { id: req.params.id, empresaId: req.usuario.empresaId, clienteId: req.usuario.id, excluidaEm: null }, select: { id: true } });
    if (!obra) return res.status(404).json({ erro: "Obra não encontrada" });
    const parcela = await prisma.parcela.findFirst({ where: { id: req.params.parcelaId, obraId: obra.id } });
    if (!parcela) return res.status(404).json({ erro: "Parcela não encontrada nesta obra" });
    if (parcela.situacao === "PAGA") return res.status(409).json({ erro: "Esta parcela já foi confirmada como paga" });
    const arquivo = req.body?.arquivo;
    let comprovanteUrl;
    if (arquivo?.mimeType === "application/pdf") comprovanteUrl = await cloudinaryService.enviarContratoObra({ arquivo, obraId: `${obra.id}/comprovantes` });
    else if (arquivo?.mimeType?.startsWith("image/")) comprovanteUrl = await cloudinaryService.enviarFotoObra({ foto: arquivo, obraId: `${obra.id}/comprovantes` });
    else return res.status(400).json({ erro: "Envie um comprovante em PDF, JPG, PNG ou WebP" });
    const atualizada = await prisma.$transaction(async (tx) => {
      const atualizadaParcela = await tx.parcela.update({ where: { id: parcela.id }, data: { comprovanteUrl, comprovanteEnviadoEm: new Date() } });
      const administradores = await tx.usuario.findMany({ where: { empresaId: req.usuario.empresaId, tipo: "ADMIN" }, select: { id: true } });
      if (administradores.length) await tx.notificacao.createMany({ data: administradores.map((administrador) => ({ empresaId: req.usuario.empresaId, usuarioId: administrador.id, obraId: obra.id, tipo: "PAGAMENTO", titulo: "Novo comprovante de pagamento", descricao: `O cliente enviou o comprovante da parcela ${parcela.numero}.` })) });
      return atualizadaParcela;
    });
    return res.status(201).json({ parcela: { id: atualizada.id, comprovanteUrl: atualizada.comprovanteUrl, comprovanteEnviadoEm: atualizada.comprovanteEnviadoEm } });
  } catch (erro) {
    if (erro.code === "CONTRATO_INVALIDO" || erro.code === "FOTO_INVALIDA") return res.status(400).json({ erro: erro.message });
    if (erro.code?.startsWith("CLOUDINARY")) return res.status(503).json({ erro: erro.message });
    console.error("Erro ao enviar comprovante:", erro.code || erro.message);
    return res.status(500).json({ erro: "Não foi possível enviar o comprovante" });
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

// Lista funcionários da empresa e as obras em que têm escala ativa.
app.get("/funcionarios", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ erro: "Banco não configurado" });
    const funcionarios = await prisma.$queryRaw(Prisma.sql`
      SELECT to_jsonb(funcionario) || jsonb_build_object(
        'usuario', CASE WHEN usuario.id IS NULL THEN NULL ELSE jsonb_build_object(
          'id', usuario.id, 'email', usuario.email, 'tipo', usuario.tipo, 'fotoUrl', usuario."fotoUrl"
        ) END,
        'escalas', COALESCE((
          SELECT jsonb_agg(
            to_jsonb(escala) || jsonb_build_object(
              'obra', jsonb_build_object('id', obraEscala.id, 'nome', obraEscala.nome, 'status', obraEscala.status)
            ) ORDER BY escala."dataInicio" DESC
          )
          FROM "ObraEscala" escala
          JOIN "Obra" obraEscala ON obraEscala.id = escala."obraId"
          WHERE escala."funcionarioId" = funcionario.id AND escala."dataFim" IS NULL
        ), '[]'::jsonb),
        'disponibilidades', COALESCE((
          SELECT jsonb_agg(
            to_jsonb(disponibilidade) || jsonb_build_object(
              'obra', jsonb_build_object('id', obraDisponibilidade.id, 'nome', obraDisponibilidade.nome, 'status', obraDisponibilidade.status)
            ) ORDER BY obraDisponibilidade.nome ASC, disponibilidade."diaSemana" ASC
          )
          FROM "DisponibilidadeFuncionario" disponibilidade
          JOIN "Obra" obraDisponibilidade ON obraDisponibilidade.id = disponibilidade."obraId"
          WHERE disponibilidade."funcionarioId" = funcionario.id
            AND obraDisponibilidade."empresaId" = ${req.usuario.empresaId}
            AND obraDisponibilidade."excluidaEm" IS NULL
        ), '[]'::jsonb)
      ) AS funcionario
      FROM "Funcionario" funcionario
      LEFT JOIN "Usuario" usuario ON usuario.id = funcionario."usuarioId"
      WHERE funcionario."empresaId" = ${req.usuario.empresaId}
      ORDER BY funcionario.ativo DESC, funcionario.nome ASC
    `);
    return res.json(funcionarios.map(({ funcionario }) => {
      const porObra = new Map();
      for (const item of funcionario.disponibilidades) {
        // Agrupa os dias e mantém o horário único da obra na resposta da API.
        if (!porObra.has(item.obraId)) porObra.set(item.obraId, { obraId: item.obraId, obra: item.obra, diasSemana: [], horarioInicio: item.horarioInicio || null });
        porObra.get(item.obraId).diasSemana.push(item.diaSemana);
      }
      return { ...funcionario, disponibilidades: [...porObra.values()] };
    }));
  } catch (erro) {
    console.error("Erro ao listar funcionários:", erro.code || erro.message);
    return res.status(500).json({ erro: "Erro ao listar funcionários" });
  }
});

app.post("/funcionarios", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const { nome, telefone, funcao, foto, disponibilidades } = req.body || {};
    if (![nome, telefone, funcao].every((valor) => typeof valor === "string" && valor.trim())) return res.status(400).json({ erro: "Nome, telefone e função são obrigatórios" });
    const erroEscala = validarDisponibilidades(disponibilidades);
    if (erroEscala) return res.status(400).json({ erro: erroEscala });
    const prisma = getPrisma();
    const obras = await prisma.obra.findMany({ where: { id: { in: disponibilidades.map((item) => item.obraId) }, empresaId: req.usuario.empresaId, excluidaEm: null }, select: { id: true } });
    if (obras.length !== new Set(disponibilidades.map((item) => item.obraId)).size) return res.status(400).json({ erro: "Uma ou mais obras não pertencem à empresa" });
    const id = crypto.randomUUID();
    const fotoUrl = foto ? await cloudinaryService.enviarFotoObra({ foto, obraId: id }) : null;
    const funcionario = await prisma.$transaction(async (tx) => {
      const novo = await tx.funcionario.create({ data: { id, empresaId: req.usuario.empresaId, nome: nome.trim(), telefone: telefone.trim(), funcao: funcao.trim(), nivel: "APOIO", fotoUrl } });
      if (disponibilidades.length) await tx.disponibilidadeFuncionario.createMany({ data: disponibilidades.flatMap((item) => [...new Set(item.diasSemana)].map((diaSemana) => ({ empresaId: req.usuario.empresaId, funcionarioId: id, obraId: item.obraId, diaSemana, horarioInicio: item.horarioInicio || null }))) });
      return novo;
    });
    return res.status(201).json({ funcionario });
  } catch (erro) {
    if (erro.code === "FOTO_INVALIDA") return res.status(400).json({ erro: erro.message });
    if (erro.code?.startsWith("CLOUDINARY")) return res.status(503).json({ erro: erro.message });
    console.error("Erro ao criar funcionário:", erro.code || erro.message);
    return res.status(500).json({ erro: "Não foi possível cadastrar o funcionário" });
  }
});

app.patch("/funcionarios/:id", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const { nome, telefone, funcao, foto, disponibilidades } = req.body || {};
    if (![nome, telefone, funcao].every((valor) => typeof valor === "string" && valor.trim())) return res.status(400).json({ erro: "Nome, telefone e função são obrigatórios" });
    const erroEscala = validarDisponibilidades(disponibilidades);
    if (erroEscala) return res.status(400).json({ erro: erroEscala });
    const prisma = getPrisma();
    const atual = await prisma.funcionario.findFirst({ where: { id: req.params.id, empresaId: req.usuario.empresaId, usuarioId: null }, select: { id: true } });
    if (!atual) return res.status(404).json({ erro: "Funcionário sem conta de acesso não encontrado" });
    const obras = await prisma.obra.findMany({ where: { id: { in: disponibilidades.map((item) => item.obraId) }, empresaId: req.usuario.empresaId, excluidaEm: null }, select: { id: true } });
    if (obras.length !== new Set(disponibilidades.map((item) => item.obraId)).size) return res.status(400).json({ erro: "Uma ou mais obras não pertencem à empresa" });
    const fotoUrl = foto ? await cloudinaryService.enviarFotoObra({ foto, obraId: atual.id }) : undefined;
    const funcionario = await prisma.$transaction(async (tx) => {
      const atualizado = await tx.funcionario.update({ where: { id: atual.id }, data: { nome: nome.trim(), telefone: telefone.trim(), funcao: funcao.trim(), ...(fotoUrl ? { fotoUrl } : {}) } });
      await tx.disponibilidadeFuncionario.deleteMany({ where: { funcionarioId: atual.id, empresaId: req.usuario.empresaId } });
      if (disponibilidades.length) await tx.disponibilidadeFuncionario.createMany({ data: disponibilidades.flatMap((item) => [...new Set(item.diasSemana)].map((diaSemana) => ({ empresaId: req.usuario.empresaId, funcionarioId: atual.id, obraId: item.obraId, diaSemana, horarioInicio: item.horarioInicio || null }))) });
      return atualizado;
    });
    return res.json({ funcionario });
  } catch (erro) {
    if (erro.code === "FOTO_INVALIDA") return res.status(400).json({ erro: erro.message });
    if (erro.code?.startsWith("CLOUDINARY")) return res.status(503).json({ erro: erro.message });
    console.error("Erro ao atualizar funcionário:", erro.code || erro.message);
    return res.status(500).json({ erro: "Não foi possível atualizar o funcionário" });
  }
});

app.delete("/funcionarios/:id", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const prisma = getPrisma();
    const funcionario = await prisma.funcionario.findFirst({ where: { id: req.params.id, empresaId: req.usuario.empresaId, usuarioId: null }, select: { id: true } });
    if (!funcionario) return res.status(404).json({ erro: "Funcionário sem conta de acesso não encontrado" });
    const escalaRegistrada = await prisma.obraEscala.count({ where: { funcionarioId: funcionario.id } });
    if (escalaRegistrada) return res.status(409).json({ erro: "Este funcionário tem histórico de escala e não pode ser excluído" });
    await prisma.$transaction(async (tx) => {
      await tx.disponibilidadeFuncionario.deleteMany({ where: { funcionarioId: funcionario.id, empresaId: req.usuario.empresaId } });
      await tx.funcionario.delete({ where: { id: funcionario.id } });
    });
    return res.json({ mensagem: "Funcionário excluído" });
  } catch (erro) {
    console.error("Erro ao excluir funcionário:", erro.code || erro.message);
    return res.status(500).json({ erro: "Não foi possível excluir o funcionário" });
  }
});

// Lista clientes da empresa e as obras que cada um acompanha.
app.get("/clientes", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ erro: "Banco não configurado" });
    const clientes = await prisma.$queryRaw(Prisma.sql`
      SELECT jsonb_build_object(
        'id', cliente.id, 'nome', cliente.nome, 'email', cliente.email,
        'telefone', cliente.telefone, 'telefoneSecundario', cliente."telefoneSecundario",
        'fotoUrl', cliente."fotoUrl", 'endereco', cliente.endereco, 'criadoEm', cliente."criadoEm",
        'obrasComoCliente', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('id', obra.id, 'nome', obra.nome, 'status', obra.status))
          FROM "Obra" obra
          WHERE obra."clienteId" = cliente.id AND obra."empresaId" = ${req.usuario.empresaId}
        ), '[]'::jsonb)
      ) AS cliente
      FROM "Usuario" cliente
      WHERE cliente."empresaId" = ${req.usuario.empresaId} AND cliente.tipo = 'CLIENTE'
      ORDER BY cliente.nome ASC
    `);
    return res.json(clientes.map(({ cliente }) => cliente));
  } catch (erro) {
    console.error("Erro ao listar clientes:", erro.code || erro.message);
    return res.status(500).json({ erro: "Erro ao listar clientes" });
  }
});

app.get("/clientes/:id", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const cliente = await getPrisma().usuario.findFirst({
      where: { id: req.params.id, empresaId: req.usuario.empresaId, tipo: "CLIENTE" },
      select: { id: true, nome: true, email: true, telefone: true, telefoneSecundario: true, endereco: true, estado: true, cidade: true, bairro: true, numero: true, complemento: true, apartamento: true, bloco: true, semApartamento: true, semBloco: true, cpf: true, fotoUrl: true,
        obrasComoCliente: { where: { empresaId: req.usuario.empresaId, excluidaEm: null }, select: { id: true, nome: true, status: true, endereco: true, estado: true, cidade: true, bairro: true, numero: true, apartamento: true, bloco: true, semApartamento: true, semBloco: true } },
      },
    });
    if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado" });
    return res.json(cliente);
  } catch (erro) { console.error("Erro ao consultar informações do cliente:", erro.code || erro.message); return res.status(500).json({ erro: "Não foi possível consultar as informações do cliente" }); }
});

app.delete("/clientes/:id", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const prisma = getPrisma();
    const cliente = await prisma.usuario.findFirst({ where: { id: req.params.id, empresaId: req.usuario.empresaId, tipo: "CLIENTE" }, select: { id: true } });
    if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado" });
    const [obrasIniciadas, pagamentos, aceites, eventos] = await Promise.all([
      prisma.obra.count({ where: { empresaId: req.usuario.empresaId, clienteId: cliente.id, status: { not: "AGENDADA" } } }),
      prisma.pagamento.count({ where: { usuarioId: cliente.id } }),
      prisma.contratoAceite.count({ where: { usuarioId: cliente.id } }),
      prisma.obraEvento.count({ where: { usuarioId: cliente.id } }),
    ]);
    if (obrasIniciadas || pagamentos || aceites || eventos) return res.status(409).json({ erro: "Este cliente tem obra iniciada ou histórico e não pode ser excluído" });
    await prisma.$transaction(async (tx) => {
      await tx.obra.updateMany({ where: { empresaId: req.usuario.empresaId, clienteId: cliente.id, status: "AGENDADA" }, data: { clienteId: null } });
      await tx.usuario.delete({ where: { id: cliente.id } });
    });
    return res.json({ mensagem: "Cliente excluído. As obras agendadas foram mantidas sem vínculo de cliente." });
  } catch (erro) { console.error("Erro ao excluir cliente:", erro.code || erro.message); return res.status(500).json({ erro: "Não foi possível excluir o cliente" }); }
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
    const corpo = req.body || {};
    const obrigatorios = ["nome", "descricao", "estado", "cidade", "bairro", "endereco", "numero", "prazoFinal"];
    if (obrigatorios.some((campo) => typeof corpo[campo] !== "string" || !corpo[campo].trim())) return res.status(400).json({ erro: "Preencha nome, descrição, estado, cidade, bairro, endereço, número e prazo da obra" });
    if (!/^\d+$/.test(corpo.numero.trim())) return res.status(400).json({ erro: "O número do endereço deve conter apenas números" });
    if (typeof corpo.semApartamento !== "boolean" || typeof corpo.semBloco !== "boolean") return res.status(400).json({ erro: "Informe se o endereço possui apartamento e bloco" });
    if (!corpo.semApartamento && (typeof corpo.apartamento !== "string" || !corpo.apartamento.trim())) return res.status(400).json({ erro: "Informe o apartamento ou marque que não existe" });
    if (!corpo.semApartamento && !/^\d+$/.test(corpo.apartamento.trim())) return res.status(400).json({ erro: "O apartamento deve conter apenas números" });
    if (!corpo.semBloco && (typeof corpo.bloco !== "string" || !corpo.bloco.trim())) return res.status(400).json({ erro: "Informe o bloco ou marque que não existe" });
    if (!corpo.semBloco && !/^[A-Za-z0-9]+$/.test(corpo.bloco.trim())) return res.status(400).json({ erro: "O bloco deve conter apenas letras e números" });
    if (typeof corpo.descricao !== "string" || corpo.descricao.trim().length > 5000 || typeof corpo.informacoesAdicionais !== "string" || !corpo.informacoesAdicionais.trim()) return res.status(400).json({ erro: "Descrição e informações de execução são obrigatórias" });
    if (typeof corpo.valorTotal !== "string" && typeof corpo.valorTotal !== "number") return res.status(400).json({ erro: "Valor base da obra é obrigatório" });
    const valorTotal = String(corpo.valorTotal);
    if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(valorTotal) || Number(valorTotal) <= 0) return res.status(400).json({ erro: "Valor base deve ser positivo e ter até duas casas decimais" });
    if (!Number.isInteger(Number(corpo.quantidadeParcelas)) || Number(corpo.quantidadeParcelas) < 1 || Number(corpo.quantidadeParcelas) > 36) return res.status(400).json({ erro: "Escolha de 1 a 36 parcelas" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(corpo.vencimentoInicial || "") || !Number.isFinite(new Date(`${corpo.vencimentoInicial}T12:00:00.000Z`).getTime())) return res.status(400).json({ erro: "Informe a data do primeiro vencimento" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(corpo.prazoFinal) || !Number.isFinite(new Date(`${corpo.prazoFinal}T12:00:00.000Z`).getTime())) return res.status(400).json({ erro: "Informe um prazo final válido" });
    if (corpo.fotos !== undefined && (!Array.isArray(corpo.fotos) || corpo.fotos.length > 5)) return res.status(400).json({ erro: "Envie até cinco fotos iniciais" });
    const prisma = getPrisma();
    let cliente = null;
    if (corpo.clienteId !== undefined && corpo.clienteId !== null && corpo.clienteId !== "") {
      cliente = await prisma.usuario.findFirst({ where: { id: corpo.clienteId, empresaId: req.usuario.empresaId, tipo: "CLIENTE" }, select: { id: true } });
      if (!cliente) return res.status(400).json({ erro: "Selecione um cliente cadastrado nesta empreiteira" });
    }
    const obra = await criarObra({ empresaId: req.usuario.empresaId, administradorId: req.usuario.id, nome: corpo.nome.trim(), descricao: corpo.descricao.trim(), endereco: corpo.endereco.trim(), estado: corpo.estado.trim(), cidade: corpo.cidade.trim(), bairro: corpo.bairro.trim(), numero: corpo.numero.trim(), apartamento: corpo.semApartamento ? null : corpo.apartamento.trim(), bloco: corpo.semBloco ? null : corpo.bloco.trim(), semApartamento: corpo.semApartamento, semBloco: corpo.semBloco, informacoesAdicionais: corpo.informacoesAdicionais.trim(), valorBase: valorTotal, prazoFinal: new Date(`${corpo.prazoFinal}T12:00:00.000Z`), clienteId: cliente?.id || null, quantidadeParcelas: Number(corpo.quantidadeParcelas), vencimentoInicial: corpo.vencimentoInicial });
    const avisos = [];
    for (const foto of corpo.fotos || []) {
      try {
        const fotoUrl = await cloudinaryService.enviarFotoObra({ foto, obraId: obra.id });
        await anexarFotoObra({ obraId: obra.id, empresaId: req.usuario.empresaId, administradorId: req.usuario.id, fotoUrl });
      } catch (erroFoto) { avisos.push(erroFoto.message || "Não foi possível enviar uma das fotos."); }
    }
    return res.status(201).json({ obra, avisos });
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
    // Mantém cache separado por usuário e perfil para preservar o escopo de acesso.
    const cacheKey = `obras:${req.usuario.tipo}:${req.usuario.id}`;
    const obras = await comCacheEmpresa(req.usuario.empresaId, cacheKey, () => listarObras(req.usuario.empresaId, req.usuario.id, req.usuario.tipo));
    return res.json(obras);
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") {
      return res.status(503).json({ erro: erro.message });
    }
    console.error("Erro ao listar obras:", erro.stack || erro.message);
    return res.status(500).json({ erro: "Erro ao listar obras" });
  }
});

app.get("/obras/arquivadas", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try { return res.json(await listarObrasArquivadas(req.usuario.empresaId)); }
  catch (erro) { console.error("Erro ao listar obras arquivadas:", erro.code || erro.message); return res.status(500).json({ erro: "Não foi possível carregar as obras arquivadas" }); }
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
    console.error("Erro ao consultar obra:", erro.stack || erro.message);
    return res.status(500).json({ erro: "Erro ao consultar obra" });
  }
});

app.patch("/obras/:id", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const dados = {};
    for (const campo of ["nome", "descricao", "endereco", "estado", "cidade", "bairro", "numero", "apartamento", "bloco", "informacoesAdicionais"]) {
      if (req.body?.[campo] !== undefined) {
        if (typeof req.body[campo] !== "string" || (campo === "nome" && !req.body[campo].trim())) {
          return res.status(400).json({ erro: campo === "nome" ? "Nome da obra não pode ficar vazio" : `${campo} deve ser texto` });
        }
        dados[campo] = req.body[campo].trim() || null;
      }
    }
    for (const campo of ["semApartamento", "semBloco"]) {
      if (req.body?.[campo] !== undefined) {
        if (typeof req.body[campo] !== "boolean") return res.status(400).json({ erro: `${campo} deve ser booleano` });
        dados[campo] = req.body[campo];
      }
    }
    if (dados.numero !== undefined && dados.numero !== null && !/^\d+$/.test(dados.numero)) return res.status(400).json({ erro: "O número do endereço deve conter apenas números" });
    if (dados.apartamento !== undefined && dados.apartamento !== null && !/^\d+$/.test(dados.apartamento)) return res.status(400).json({ erro: "O apartamento deve conter apenas números" });
    if (dados.bloco !== undefined && dados.bloco !== null && !/^[A-Za-z0-9]+$/.test(dados.bloco)) return res.status(400).json({ erro: "O bloco deve conter apenas letras e números" });
    if (req.body?.prazoFinal !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(req.body.prazoFinal) || !Number.isFinite(new Date(`${req.body.prazoFinal}T12:00:00.000Z`).getTime())) return res.status(400).json({ erro: "Informe um prazo final válido" });
      dados.prazoFinal = new Date(`${req.body.prazoFinal}T12:00:00.000Z`);
    }
    if (req.body?.quantidadeParcelas !== undefined) {
      if (!Number.isInteger(Number(req.body.quantidadeParcelas)) || Number(req.body.quantidadeParcelas) < 1 || Number(req.body.quantidadeParcelas) > 36) return res.status(400).json({ erro: "Escolha de 1 a 36 parcelas" });
      dados.quantidadeParcelas = Number(req.body.quantidadeParcelas);
    }
    if (req.body?.vencimentoInicial !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(req.body.vencimentoInicial) || !Number.isFinite(new Date(`${req.body.vencimentoInicial}T12:00:00.000Z`).getTime())) return res.status(400).json({ erro: "Informe a data do primeiro vencimento" });
      dados.vencimentoInicial = new Date(`${req.body.vencimentoInicial}T12:00:00.000Z`);
    }
    if (req.body?.valorTotal !== undefined) {
      const valor = String(req.body.valorTotal);
      if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(valor) || Number(valor) <= 0) return res.status(400).json({ erro: "Valor final deve ser positivo e ter até duas casas decimais" });
      dados.valorTotal = valor;
    }
    if (req.body?.clienteId !== undefined) {
      if (typeof req.body.clienteId !== "string" || !req.body.clienteId.trim()) return res.status(400).json({ erro: "Selecione um cliente válido" });
      const cliente = await getPrisma().usuario.findFirst({ where: { id: req.body.clienteId, empresaId: req.usuario.empresaId, tipo: "CLIENTE" }, select: { id: true } });
      if (!cliente) return res.status(400).json({ erro: "Cliente não encontrado nesta empreiteira" });
      dados.clienteId = cliente.id;
    }
    if (Object.keys(dados).length === 0) return res.status(400).json({ erro: "Informe ao menos um campo para atualizar" });
    const resultado = await atualizarDadosObra({ obraId: req.params.id, empresaId: req.usuario.empresaId, administradorId: req.usuario.id, dados });
    if (!resultado) return res.status(404).json({ erro: "Obra não encontrada" });
    return res.json(resultado);
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") return res.status(503).json({ erro: erro.message });
    if (erro.code === "VALOR_OBRA_TRAVADO") return res.status(409).json({ erro: erro.message });
    console.error("Erro ao atualizar dados da obra:", erro.code || erro.message);
    return res.status(500).json({ erro: "Erro ao atualizar dados da obra" });
  }
});

app.post("/obras/:id/contrato", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const { arquivo, termos = "" } = req.body || {};
    if (typeof termos !== "string" || termos.length > 20000) return res.status(400).json({ erro: "Os termos do contrato devem ter até 20.000 caracteres" });
    const arquivoUrl = arquivo ? await cloudinaryService.enviarContratoObra({ arquivo, obraId: req.params.id }) : null;
    const contrato = await salvarContratoObra({ obraId: req.params.id, empresaId: req.usuario.empresaId, administradorId: req.usuario.id, termos: termos.trim(), arquivoUrl });
    if (!contrato) return res.status(404).json({ erro: "Obra não encontrada" });
    return res.status(201).json({ contrato });
  } catch (erro) {
    if (erro.code === "CONTRATO_INVALIDO") return res.status(400).json({ erro: erro.message });
    if (erro.code?.startsWith("CLOUDINARY")) return res.status(503).json({ erro: erro.message });
    console.error("Erro ao anexar contrato:", erro.code || erro.message);
    return res.status(500).json({ erro: "Não foi possível anexar o contrato" });
  }
});

app.post("/obras/:id/fotos", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const foto = req.body?.foto;
    const obra = await getPrisma().obra.findFirst({ where: { id: req.params.id, empresaId: req.usuario.empresaId, excluidaEm: null }, select: { id: true, fotos: true } });
    if (!obra) return res.status(404).json({ erro: "Obra não encontrada" });
    if (obra.fotos.length >= 20) return res.status(409).json({ erro: "A obra já atingiu o limite de 20 fotos" });
    const fotoUrl = await cloudinaryService.enviarFotoObra({ foto, obraId: obra.id });
    const atualizada = await anexarFotoObra({ obraId: obra.id, empresaId: req.usuario.empresaId, administradorId: req.usuario.id, fotoUrl });
    return res.status(201).json({ obra: atualizada });
  } catch (erro) {
    if (erro.code === "FOTO_INVALIDA") return res.status(400).json({ erro: erro.message });
    if (erro.code?.startsWith("CLOUDINARY")) return res.status(503).json({ erro: erro.message });
    console.error("Erro ao adicionar foto da obra:", erro.code || erro.message);
    return res.status(500).json({ erro: "Não foi possível adicionar a foto" });
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

    const agendadaPara = converterDataISO(corpo.agendadaPara);
    const prazoFinal = converterDataISO(corpo.prazoFinal);
    if (!agendadaPara || !prazoFinal) {
      return res.status(400).json({ erro: "Informe datas válidas para o início e o prazo final" });
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
        agendadaPara: resultado.agendadaPara.toISOString().slice(0, 10),
        prazoFinal: resultado.prazoFinal.toISOString().slice(0, 10),
      },
      evento: resultado.evento,
      alterada: resultado.alterada,
    });
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") return res.status(503).json({ erro: erro.message });
    if (erro.code === "INICIO_OBRA_BLOQUEADO") return res.status(400).json({ erro: erro.message });
    if (erro.code === "AGENDAMENTO_CONCORRENTE" || erro.code === "P2034") {
      return res.status(409).json({ erro: erro.message || "O agendamento foi alterado por outra operação; atualize e tente novamente" });
    }
    console.error("Erro ao reagendar obra:", erro.code || erro.message);
    return res.status(500).json({ erro: "Erro ao reagendar obra" });
  }
});

// A conclusão percorre duas operações explícitas, cada uma autorizada por perfil.
app.post("/obras/:id/status/iniciar", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const resultado = await iniciarExecucaoObra({ obraId: req.params.id, empresaId: req.usuario.empresaId, administradorId: req.usuario.id });
    return res.json(resultado);
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") return res.status(503).json({ erro: erro.message });
    if (erro.code === "OBRA_NAO_ENCONTRADA") return res.status(404).json({ erro: erro.message });
    if (erro.code === "STATUS_INVALIDO") return res.status(409).json({ erro: erro.message });
    if (erro.code === "PRIMEIRA_PARCELA_PENDENTE") return res.status(409).json({ erro: erro.message });
    if (erro.code === "CONVITE_CLIENTE_PENDENTE") return res.status(409).json({ erro: erro.message });
    if (erro.code === "P2034") return res.status(409).json({ erro: "A obra foi alterada por outra operação; atualize e tente novamente" });
    console.error("Erro ao iniciar execução da obra:", erro.code || erro.message);
    return res.status(500).json({ erro: "Erro ao iniciar execução da obra" });
  }
});

app.post("/obras/:id/parcelas/primeira/confirmar", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const parcela = await confirmarPrimeiraParcela({ obraId: req.params.id, empresaId: req.usuario.empresaId, administradorId: req.usuario.id });
    return res.json({ parcela });
  } catch (erro) {
    if (erro.code === "DATABASE_NOT_CONFIGURED") return res.status(503).json({ erro: erro.message });
    if (erro.code === "PARCELA_NAO_ENCONTRADA") return res.status(404).json({ erro: erro.message });
    if (erro.code === "PAGAMENTO_ONLINE_PENDENTE") return res.status(409).json({ erro: erro.message });
    if (erro.code === "CONVITE_CLIENTE_PENDENTE") return res.status(409).json({ erro: erro.message });
    if (erro.code === "P2034") return res.status(409).json({ erro: "O pagamento mudou durante a confirmação. Atualize os dados antes de tentar novamente" });
    console.error("Erro ao confirmar primeira parcela:", erro.code || erro.message);
    return res.status(500).json({ erro: "Não foi possível confirmar o recebimento" });
  }
});

app.post("/obras/:id/arquivar", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const { senha, motivo } = req.body || {};
    if (typeof senha !== "string" || !senha || typeof motivo !== "string" || motivo.trim().length < 10 || motivo.trim().length > 500) return res.status(400).json({ erro: "Confirme sua senha e informe o motivo da exclusão (10 a 500 caracteres)" });
    const administrador = await buscarUsuarioPorId(req.usuario.id);
    if (!administrador || !(await bcrypt.compare(senha, administrador.senhaHash))) return res.status(401).json({ erro: "Senha de confirmação incorreta" });
    const obra = await arquivarObra({ obraId: req.params.id, empresaId: req.usuario.empresaId, administradorId: req.usuario.id, motivo: motivo.trim() });
    if (!obra) return res.status(404).json({ erro: "Obra não encontrada" });
    return res.json({ mensagem: "Obra arquivada por sete dias", exclusaoExpiraEm: obra.exclusaoExpiraEm });
  } catch (erro) {
    const respostas = { OBRA_EM_EXECUCAO: 409, OBRA_NAO_AGENDADA: 409, PAGAMENTO_RECEBIDO: 409, ACEITE_CLIENTE_NECESSARIO: 409 };
    if (erro.code === "DATABASE_NOT_CONFIGURED") return res.status(503).json({ erro: erro.message });
    if (erro.code === "P2034") return res.status(409).json({ erro: "A obra foi alterada durante a exclusão. Atualize e tente novamente" });
    if (respostas[erro.code]) return res.status(respostas[erro.code]).json({ erro: erro.message });
    console.error("Erro ao arquivar obra:", erro.code || erro.message);
    return res.status(500).json({ erro: "Não foi possível arquivar a obra" });
  }
});

app.post("/obras/:id/restaurar", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const obra = await restaurarObra({ obraId: req.params.id, empresaId: req.usuario.empresaId });
    if (!obra) return res.status(404).json({ erro: "Obra arquivada não encontrada" });
    return res.json({ mensagem: "Obra restaurada" });
  } catch (erro) {
    if (erro.code === "PRAZO_RESTAURACAO_EXPIRADO") return res.status(410).json({ erro: erro.message });
    console.error("Erro ao restaurar obra:", erro.code || erro.message);
    return res.status(500).json({ erro: "Não foi possível restaurar a obra" });
  }
});

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
    if (alocacao.funcionario?.usuarioId) invalidarSessaoUsuario(alocacao.funcionario.usuarioId);
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
      FUNCAO_DUPLICADA: [409, "Cada gerente desta obra precisa ter uma função diferente"],
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
    if (alocacao.funcionario?.usuarioId) invalidarSessaoUsuario(alocacao.funcionario.usuarioId);
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

app.post("/obras/:id/colaboradores/:alocacaoId/mover", authMiddleware, exigirEmpresaDoToken, exigirPapel("ADMIN"), async (req, res) => {
  try {
    const novaObraId = req.body?.novaObraId;
    if (typeof novaObraId !== "string" || !novaObraId.trim()) return res.status(400).json({ erro: "Selecione a obra de destino" });
    const resultado = await moverAlocacao({ obraId: req.params.id, novaObraId: novaObraId.trim(), empresaId: req.usuario.empresaId, alocacaoId: req.params.alocacaoId, administradorId: req.usuario.id });
    if (resultado.usuarioId) invalidarSessaoUsuario(resultado.usuarioId);
    return res.json(resultado);
  } catch (erro) {
    const respostas = { OBRA_NAO_ENCONTRADA: [404, "Obra não encontrada"], ALOCACAO_NAO_ENCONTRADA: [404, erro.message], OBRA_DESTINO_INVALIDA: [400, erro.message], ALOCACAO_DUPLICADA: [409, erro.message] };
    if (respostas[erro.code]) return res.status(respostas[erro.code][0]).json({ erro: respostas[erro.code][1] });
    console.error("Erro ao mover gerente:", erro.code || erro.message);
    return res.status(500).json({ erro: "Não foi possível mover o gerente" });
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
