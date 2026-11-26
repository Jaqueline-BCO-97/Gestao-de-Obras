// Importa o cliente do banco e a verificação de configuração.
const { getPrisma, isDbConfigured } = require("../config/db");
const { Prisma } = require("@prisma/client");
// Reutiliza a regra pura de ausência de pagamentos nos fluxos de vencimento e F7.
const { obraSemMovimentoDePagamento } = require("../utils/obraSemMovimentoPagamento");
// Reutiliza a mesma normalização em todos os bloqueios de função repetida.
const { normalizarFuncaoComparacao } = require("../utils/normalizarFuncao");

// Impede consultas enquanto a conexão do banco não estiver configurada.
function exigirBancoConfigurado() {
  // Verifica se existe uma configuração válida para o banco.
  if (!isDbConfigured()) {
    // Cria um erro que a rota reconhece como falta de configuração.
    const erro = new Error("Banco não configurado. Defina DATABASE_URL no .env (PostgreSQL do Supabase)");
    // Identifica o erro para a resposta HTTP adequada.
    erro.code = "DATABASE_NOT_CONFIGURED";
    // Interrompe a consulta e devolve o erro à rota.
    throw erro;
  }
}

// Cria erros de domínio que as rotas convertem em respostas HTTP previsíveis.
function erroAlocacao(code, message) {
  const erro = new Error(message);
  erro.code = code;
  return erro;
}

// Padroniza falhas de autorização/validação do registro de andamento.
function erroAndamento(code, message) {
  const erro = new Error(message);
  erro.code = code;
  return erro;
}

function erroAgendamento(code, message) {
  const erro = new Error(message);
  erro.code = code;
  return erro;
}

function erroConclusao(code, message) {
  const erro = new Error(message);
  erro.code = code;
  return erro;
}

// Padroniza o bloqueio do vencimento quando a obra começou ou teve pagamento.
function erroVencimentoObra() {
  // Usa a mesma mensagem para status incompatível e movimento financeiro.
  const erro = new Error("Só é possível alterar o vencimento enquanto a obra não começou e nenhuma parcela tiver pagamento.");
  // Permite que as rotas convertam esta regra em HTTP 409.
  erro.code = "VENCIMENTO_OBRA_BLOQUEADO";
  // Devolve o erro de domínio para a transação encerrar sem gravar parcialmente.
  return erro;
}

async function notificarEventoObra(tx, { obraId, empresaId, evento, visivelParaCliente = true, autorId = null, incluirGerentes = true, somenteCliente = false, descricaoNotificacao = null }) {
  const [obra, administradores, escalasAtivas] = await Promise.all([
    tx.obra.findFirst({ where: { id: obraId, empresaId }, select: { clienteId: true } }),
    somenteCliente ? [] : tx.usuario.findMany({ where: { empresaId, tipo: "ADMIN", ...(autorId ? { id: { not: autorId } } : {}) }, select: { id: true } }),
    !somenteCliente && incluirGerentes && tx.obraEscala?.findMany
      ? tx.obraEscala.findMany({ where: { obraId, dataFim: null, funcionario: { ativo: true } }, select: { funcionario: { select: { usuarioId: true } } } })
      : [],
  ]);
  // Mantém os destinatários atuais ou restringe a notificação ao cliente vinculado.
  const destinatarios = somenteCliente
    ? (visivelParaCliente && obra?.clienteId && obra.clienteId !== autorId ? [obra.clienteId] : [])
    : [
    ...administradores.map(({ id }) => id),
    ...escalasAtivas.map(({ funcionario }) => funcionario?.usuarioId).filter(Boolean),
    ...(visivelParaCliente && obra?.clienteId && obra.clienteId !== autorId ? [obra.clienteId] : []),
    ].filter((usuarioId) => usuarioId !== autorId);
  if (!destinatarios.length) return;
  const descricao = evento.descricao || "";
  const conclusao = /conclus[aã]o da obra confirmada/i.test(descricao);
  const tipoNotificacao = conclusao ? "CONCLUSAO" : evento.tipo;
  const titulo = conclusao ? "Cliente confirmou a conclusão" : evento.tipo === "AGENDAMENTO" ? "Alteração no calendário da obra" : evento.tipo === "PAGAMENTO" ? "Pagamento atualizado" : evento.tipo === "CONTRATO" ? "Contrato atualizado" : evento.tipo === "EQUIPE" ? "Alteração de equipe" : "Atualização da obra";
  await tx.notificacao.createMany({ data: destinatarios.map((usuarioId) => ({
    empresaId, usuarioId, obraId, eventoId: evento.id, tipo: tipoNotificacao,
    titulo,
    descricao: descricaoNotificacao || descricao,
  })) });
}

async function validarPermissaoAndamento({ obraId, empresaId, usuarioId, papel }) {
  exigirBancoConfigurado();
  const prisma = getPrisma();
  const obra = await prisma.obra.findFirst({ where: { id: obraId, empresaId }, select: { id: true } });
  if (!obra) return false;
  if (papel === "ADMIN") return true;

  const funcionario = await prisma.funcionario.findFirst({
    where: { empresaId, usuarioId, ativo: true },
    select: { id: true, empresaId: true, usuarioId: true, usuario: { select: { empresaId: true, tipo: true } } },
  });
  if (!funcionario || funcionario.empresaId !== empresaId || funcionario.usuarioId !== usuarioId || funcionario.usuario?.empresaId !== empresaId || funcionario.usuario?.tipo !== "COLABORADOR") {
    throw erroAndamento("COLABORADOR_SEM_VINCULO", "Usuário não possui cadastro de colaborador válido nesta empresa");
  }
  const alocacao = await prisma.obraEscala.findFirst({ where: { obraId, funcionarioId: funcionario.id, dataFim: null }, select: { id: true } });
  if (!alocacao) throw erroAndamento("COLABORADOR_SEM_ALOCACAO", "Colaborador não está alocado atualmente nesta obra");
  return true;
}

async function solicitarConferenciaObra({ obraId, empresaId, administradorId }) {
  exigirBancoConfigurado();
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const obra = await tx.obra.findFirst({
      where: { id: obraId, empresaId },
      select: { id: true, status: true },
    });
    if (!obra) throw erroConclusao("OBRA_NAO_ENCONTRADA", "Obra não encontrada");
    if (obra.status !== "EM_ANDAMENTO") {
      throw erroConclusao("STATUS_INVALIDO", "Somente obras em andamento podem ser enviadas para conferência");
    }
    const agora = new Date();
    const atualizada = await tx.obra.update({
      where: { id: obraId },
      data: { status: "AGUARDANDO_CONFERENCIA", conclusaoSolicitadaEm: agora },
    });
    const evento = await tx.obraEvento.create({
      data: { obraId, empresaId, usuarioId: administradorId, tipo: "STATUS", descricao: "Obra pronta para conferência do cliente.", visivelParaCliente: true },
    });
    await notificarEventoObra(tx, { obraId, empresaId, evento, autorId: administradorId });
    return { obra: atualizada, evento };
  }, { isolationLevel: "Serializable" });
}

async function iniciarExecucaoObra({ obraId, empresaId, administradorId }) {
  exigirBancoConfigurado();
  const prisma = getPrisma();
  return emTransacaoSerializavel(prisma, async (tx) => {
    const obra = await tx.obra.findFirst({ where: { id: obraId, empresaId, excluidaEm: null }, select: { id: true, status: true } });
    if (!obra) throw erroConclusao("OBRA_NAO_ENCONTRADA", "Obra não encontrada");
    if (obra.status !== "AGENDADA") throw erroConclusao("STATUS_INVALIDO", "Somente uma obra agendada pode iniciar execução");
    const convitePendente = await tx.convite.findFirst({ where: { obraId, tipo: "CLIENTE", usadoEm: null, expiraEm: { gt: new Date() } }, select: { id: true } });
    if (convitePendente) throw erroConclusao("CONVITE_CLIENTE_PENDENTE", "Aguarde o cliente aceitar o convite antes de iniciar a execução");
    const primeiraParcela = await tx.parcela.findFirst({ where: { obraId, numero: 1 }, select: { situacao: true } });
    if (!primeiraParcela || primeiraParcela.situacao !== "PAGA") throw erroConclusao("PRIMEIRA_PARCELA_PENDENTE", "A primeira parcela precisa estar confirmada como paga para iniciar a execução");
    const atualizada = await tx.obra.update({ where: { id: obraId }, data: { status: "EM_ANDAMENTO" } });
    const evento = await tx.obraEvento.create({
      data: { obraId, empresaId, usuarioId: administradorId, tipo: "STATUS", descricao: "Execução da obra iniciada.", visivelParaCliente: true },
    });
    await notificarEventoObra(tx, { obraId, empresaId, evento, autorId: administradorId });
    return { obra: atualizada, evento };
  });
}

async function confirmarConclusaoObra({ obraId, empresaId, clienteId }) {
  exigirBancoConfigurado();
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const obra = await tx.obra.findFirst({
      where: { id: obraId, empresaId, clienteId },
      select: { id: true, status: true, conclusaoConfirmadaEm: true },
    });
    if (!obra) throw erroConclusao("OBRA_NAO_ENCONTRADA", "Obra não encontrada");
    if (obra.status !== "AGUARDANDO_CONFERENCIA" || obra.conclusaoConfirmadaEm) {
      throw erroConclusao("STATUS_INVALIDO", "A obra não está aguardando confirmação de conclusão");
    }
    const agora = new Date();
    const parcelas = await tx.parcela.findMany({ where: { obraId }, select: { situacao: true } });
    const todasParcelasPagas = parcelas.length > 0 && parcelas.every((parcela) => parcela.situacao === "PAGA");
    const atualizada = await tx.obra.update({
      where: { id: obraId },
      data: { ...(todasParcelasPagas ? { status: "CONCLUIDA" } : {}), conclusaoConfirmadaEm: agora },
    });
    const evento = await tx.obraEvento.create({
      data: { obraId, empresaId, usuarioId: clienteId, tipo: "STATUS", descricao: "Conclusão da obra confirmada pelo cliente.", visivelParaCliente: true },
    });
    await notificarEventoObra(tx, { obraId, empresaId, evento, autorId: clienteId });
    return { obra: atualizada, evento };
  }, { isolationLevel: "Serializable" });
}

// Executa mudanças de escala em transação serializável para reduzir disputas
// concorrentes, especialmente duas tentativas simultâneas da mesma alocação.
function emTransacaoSerializavel(prisma, operacao) {
  return prisma.$transaction(operacao, { isolationLevel: "Serializable" });
}

async function listarAlocacoesDaObra(obraId, empresaId) {
  exigirBancoConfigurado();
  const obra = await getPrisma().obra.findFirst({
    where: { id: obraId, empresaId },
    select: {
      id: true,
      escalas: {
        where: { funcionario: { empresaId } },
        include: { funcionario: { select: { id: true, nome: true, funcao: true, nivel: true, usuarioId: true } }, alteradoPor: { select: { id: true, nome: true } } },
        orderBy: [{ dataInicio: "desc" }, { id: "desc" }],
      },
      empresa: { select: { funcionarios: { where: { nivel: "RESPONSAVEL", ativo: true, usuarioId: { not: null }, usuario: { is: { tipo: "COLABORADOR" } } }, select: { id: true, nome: true, funcao: true, usuarioId: true }, orderBy: { nome: "asc" } } } },
    },
  });
  if (!obra) return null;
  const alocacoes = obra.escalas;

  return {
    alocacoesAbertas: alocacoes.filter((alocacao) => alocacao.dataFim === null),
    historico: alocacoes.filter((alocacao) => alocacao.dataFim !== null),
    gerentesDisponiveis: obra.empresa.funcionarios,
  };
}

async function alocarFuncionario({ obraId, empresaId, funcionarioId, administradorId }) {
  exigirBancoConfigurado();
  const prisma = getPrisma();

  return emTransacaoSerializavel(prisma, async (tx) => {
    const obra = await tx.obra.findFirst({ where: { id: obraId, empresaId }, select: { id: true } });
    if (!obra) throw erroAlocacao("OBRA_NAO_ENCONTRADA", "Obra não encontrada");

    const funcionario = await tx.funcionario.findFirst({
      where: { id: funcionarioId, empresaId },
      select: {
        id: true,
        nome: true,
        funcao: true,
        nivel: true,
        ativo: true,
        empresaId: true,
        usuarioId: true,
        usuario: { select: { empresaId: true, tipo: true } },
      },
    });
    if (!funcionario) throw erroAlocacao("FUNCIONARIO_NAO_ENCONTRADO", "Funcionário não encontrado nesta empresa");
    if (funcionario.nivel !== "RESPONSAVEL") {
      throw erroAlocacao("NIVEL_FUNCIONARIO_INVALIDO", "Somente funcionários de nível Responsável podem ser alocados");
    }
    if (!funcionario.ativo) throw erroAlocacao("FUNCIONARIO_INATIVO", "Funcionário inativo não pode ser alocado");

    // usuarioId é opcional no schema. Quando há login vinculado, ele também
    // precisa pertencer à empresa e ter perfil COLABORADOR para não conceder
    // acesso indireto a outro perfil ou empresa.
    if (funcionario.usuarioId && (
      !funcionario.usuario ||
      funcionario.usuario.empresaId !== empresaId ||
      funcionario.usuario.tipo !== "COLABORADOR"
    )) {
      throw erroAlocacao("VINCULO_USUARIO_INVALIDO", "O login vinculado ao funcionário não é um colaborador válido desta empresa");
    }

    const escalasAbertas = await tx.obraEscala.findMany({
      where: { obraId, dataFim: null },
      select: { id: true, funcionarioId: true, funcionario: { select: { funcao: true } } },
    });
    if (escalasAbertas.some((escala) => escala.funcionarioId === funcionarioId)) throw erroAlocacao("ALOCACAO_DUPLICADA", "Funcionário já possui alocação aberta nesta obra");
    // Compara cópias normalizadas e conserva a função original no funcionário.
    if (escalasAbertas.some((escala) => normalizarFuncaoComparacao(escala.funcionario.funcao) === normalizarFuncaoComparacao(funcionario.funcao))) throw erroAlocacao("FUNCAO_DUPLICADA", "Cada gerente desta obra precisa ter uma função diferente");

    const alocacao = await tx.obraEscala.create({
      data: {
        obraId,
        funcionarioId,
        dataInicio: new Date(),
        alteradoPorId: administradorId,
      },
      include: {
        funcionario: { select: { id: true, nome: true, funcao: true, nivel: true, usuarioId: true } },
        alteradoPor: { select: { id: true, nome: true } },
      },
    });
    const evento = await tx.obraEvento.create({
      data: { obraId, empresaId, usuarioId: administradorId, tipo: "EQUIPE", descricao: `${funcionario.nome} (${funcionario.funcao}) recebeu acesso à obra.`, visivelParaCliente: false },
    });
    await notificarEventoObra(tx, { obraId, empresaId, evento, visivelParaCliente: false, autorId: administradorId, incluirGerentes: false });
    if (funcionario.usuarioId) await tx.notificacao.create({ data: { empresaId, usuarioId: funcionario.usuarioId, obraId, eventoId: evento.id, tipo: "EQUIPE", titulo: "Você recebeu acesso a uma obra", descricao: `A empreiteira atribuiu acesso à obra ${obra.nome || "selecionada"}.` } });
    return alocacao;
  });
}

async function encerrarAlocacao({ obraId, empresaId, alocacaoId, administradorId, motivo }) {
  exigirBancoConfigurado();
  const prisma = getPrisma();

  return emTransacaoSerializavel(prisma, async (tx) => {
    const obra = await tx.obra.findFirst({ where: { id: obraId, empresaId }, select: { id: true } });
    if (!obra) throw erroAlocacao("OBRA_NAO_ENCONTRADA", "Obra não encontrada");

    const alocacao = await tx.obraEscala.findFirst({
      where: { id: alocacaoId, obraId, obra: { empresaId } },
      select: { id: true, dataFim: true, funcionario: { select: { nome: true, usuarioId: true } } },
    });
    if (!alocacao) throw erroAlocacao("ALOCACAO_NAO_ENCONTRADA", "Alocação não encontrada nesta obra");
    if (alocacao.dataFim) throw erroAlocacao("ALOCACAO_JA_ENCERRADA", "Esta alocação já foi encerrada");

    // O filtro adicional dataFim:null protege contra duas solicitações de
    // encerramento concorrentes sem apagar o registro histórico.
    const atualizacao = await tx.obraEscala.updateMany({
      where: { id: alocacaoId, obraId, dataFim: null },
      data: {
        dataFim: new Date(),
        alteradoPorId: administradorId,
        ...(motivo ? { motivo } : {}),
      },
    });
    if (atualizacao.count !== 1) {
      throw erroAlocacao("ALOCACAO_JA_ENCERRADA", "Esta alocação já foi encerrada");
    }

    const encerrada = await tx.obraEscala.findUnique({
      where: { id: alocacaoId },
      include: {
        funcionario: { select: { id: true, nome: true, funcao: true, nivel: true, usuarioId: true } },
        alteradoPor: { select: { id: true, nome: true } },
      },
    });
    const evento = await tx.obraEvento.create({
      data: { obraId, empresaId, usuarioId: administradorId, tipo: "EQUIPE", descricao: `Acesso de ${encerrada.funcionario.nome} encerrado${motivo ? `: ${motivo}` : "."}`, visivelParaCliente: false },
    });
    await notificarEventoObra(tx, { obraId, empresaId, evento, visivelParaCliente: false, autorId: administradorId });
    if (encerrada.funcionario.usuarioId) await tx.notificacao.create({ data: { empresaId, usuarioId: encerrada.funcionario.usuarioId, obraId, eventoId: evento.id, tipo: "EQUIPE", titulo: "Acesso à obra encerrado", descricao: "A empreiteira encerrou seu acesso a esta obra." } });
    return encerrada;
  });
}

async function moverAlocacao({ obraId, novaObraId, empresaId, alocacaoId, administradorId }) {
  exigirBancoConfigurado();
  return emTransacaoSerializavel(getPrisma(), async (tx) => {
    const [origem, destino, escala] = await Promise.all([
      tx.obra.findFirst({ where: { id: obraId, empresaId, excluidaEm: null }, select: { id: true, nome: true } }),
      tx.obra.findFirst({ where: { id: novaObraId, empresaId, excluidaEm: null }, select: { id: true, nome: true } }),
      tx.obraEscala.findFirst({ where: { id: alocacaoId, obraId, dataFim: null, obra: { empresaId }, funcionario: { empresaId, usuarioId: { not: null } } }, include: { funcionario: true } }),
    ]);
    if (!origem || !destino || !escala) throw erroAlocacao("ALOCACAO_NAO_ENCONTRADA", "Obra ou gerente não encontrado nesta empresa");
    if (obraId === novaObraId) throw erroAlocacao("OBRA_DESTINO_INVALIDA", "Selecione uma obra diferente da atual");
    const repetida = await tx.obraEscala.findFirst({ where: { obraId: novaObraId, funcionarioId: escala.funcionarioId, dataFim: null } });
    if (repetida) throw erroAlocacao("ALOCACAO_DUPLICADA", "O gerente já tem acesso à obra selecionada");
    await tx.obraEscala.updateMany({ where: { id: escala.id, obraId, funcionarioId: escala.funcionarioId, dataFim: null }, data: { dataFim: new Date(), alteradoPorId: administradorId, motivo: "Acesso transferido para outra obra" } });
    const novaEscala = await tx.obraEscala.create({ data: { obraId: novaObraId, funcionarioId: escala.funcionarioId, alteradoPorId: administradorId, motivo: `Transferido de ${origem.nome}` }, include: { funcionario: { select: { id: true, nome: true, funcao: true, usuarioId: true } } } });
    const eventoOrigem = await tx.obraEvento.create({ data: { obraId, empresaId, usuarioId: administradorId, tipo: "EQUIPE", descricao: `Acesso de ${escala.funcionario.nome} transferido para outra obra.`, visivelParaCliente: false } });
    await notificarEventoObra(tx, { obraId, empresaId, evento: eventoOrigem, visivelParaCliente: false, autorId: administradorId });
    const eventoDestino = await tx.obraEvento.create({ data: { obraId: novaObraId, empresaId, usuarioId: administradorId, tipo: "EQUIPE", descricao: `${escala.funcionario.nome} recebeu acesso de gerente à obra.`, visivelParaCliente: false } });
    await notificarEventoObra(tx, { obraId: novaObraId, empresaId, evento: eventoDestino, visivelParaCliente: false, autorId: administradorId, incluirGerentes: false });
    if (escala.funcionario.usuarioId) await tx.notificacao.create({ data: { empresaId, usuarioId: escala.funcionario.usuarioId, obraId: novaObraId, eventoId: eventoDestino.id, tipo: "EQUIPE", titulo: "Você foi movido para outra obra", descricao: `Seu acesso foi transferido de ${origem.nome} para ${destino.nome}.` } });
    return { alocacao: novaEscala, funcionarioId: escala.funcionarioId, usuarioId: escala.funcionario.usuarioId, obraDestino: destino.nome };
  });
}

async function confirmarPrimeiraParcela({ obraId, empresaId, administradorId }) {
  exigirBancoConfigurado();
  return getPrisma().$transaction(async (tx) => {
    const convitePendente = await tx.convite.findFirst({ where: { obraId, tipo: "CLIENTE", usadoEm: null, expiraEm: { gt: new Date() } }, select: { id: true } });
    if (convitePendente) throw erroConclusao("CONVITE_CLIENTE_PENDENTE", "Aguarde o cliente aceitar o convite antes de confirmar a primeira parcela");
    const parcela = await tx.parcela.findFirst({ where: { obraId, numero: 1, obra: { empresaId, excluidaEm: null } } });
    if (!parcela) throw erroConclusao("PARCELA_NAO_ENCONTRADA", "Primeira parcela não encontrada");
    if (parcela.situacao === "PAGA") return parcela;
    const tentativaPendente = await tx.pagamento.findFirst({ where: { parcelaId: parcela.id, status: "PENDENTE" }, select: { id: true } });
    if (tentativaPendente) throw erroConclusao("PAGAMENTO_ONLINE_PENDENTE", "Aguarde a confirmação ou o cancelamento do pagamento online antes de confirmar manualmente");
    const atualizada = await tx.parcela.update({ where: { id: parcela.id }, data: { situacao: "PAGA", pagaEm: new Date() } });
    const evento = await tx.obraEvento.create({ data: { obraId, empresaId, usuarioId: administradorId, tipo: "PAGAMENTO", descricao: "A empreiteira confirmou o recebimento da primeira parcela.", visivelParaCliente: true } });
    await notificarEventoObra(tx, { obraId, empresaId, evento, autorId: administradorId });
    return atualizada;
  }, { isolationLevel: "Serializable" });
}

async function registrarAndamento({ obraId, empresaId, usuarioId, tipo, descricao, fotoUrl = null, visivelParaCliente = true, papel = "COLABORADOR" }) {
  exigirBancoConfigurado();
  const prisma = getPrisma();

  // Autorizar e gravar dentro da mesma transação evita aceitar uma obra de
  // outra empresa ou uma escala que já tenha sido encerrada durante a chamada.
  return prisma.$transaction(async (tx) => {
    const obra = await tx.obra.findFirst({
      where: { id: obraId, empresaId },
      select: { id: true },
    });
    if (!obra) return null;

    if (papel === "COLABORADOR") {
      const funcionario = await tx.funcionario.findFirst({
        // A consulta exige ativo:true dentro da transação; uma escala antiga não
        // deve permitir novo registro se o funcionário foi desativado.
        where: { empresaId, usuarioId, ativo: true },
        select: {
          id: true,
          empresaId: true,
          usuarioId: true,
          usuario: { select: { empresaId: true, tipo: true } },
        },
      });
      if (
        !funcionario ||
        funcionario.empresaId !== empresaId ||
        funcionario.usuarioId !== usuarioId ||
        funcionario.usuario?.empresaId !== empresaId ||
        funcionario.usuario?.tipo !== "COLABORADOR"
      ) {
        throw erroAndamento("COLABORADOR_SEM_VINCULO", "Usuário não possui cadastro de colaborador válido nesta empresa");
      }

      const alocacaoAtiva = await tx.obraEscala.findFirst({
        where: { obraId, funcionarioId: funcionario.id, dataFim: null },
        select: { id: true },
      });
      if (!alocacaoAtiva) {
        throw erroAndamento("COLABORADOR_SEM_ALOCACAO", "Colaborador não está alocado atualmente nesta obra");
      }
    }

    const evento = await tx.obraEvento.create({
      data: {
        obraId,
        empresaId,
        usuarioId,
        tipo,
        descricao,
        visivelParaCliente: papel === "ADMIN" ? visivelParaCliente : true,
        fotoUrl,
      },
      include: { usuario: { select: { id: true, nome: true } } },
    });
    await notificarEventoObra(tx, { obraId, empresaId, evento, visivelParaCliente: papel === "ADMIN" ? visivelParaCliente : true, autorId: usuarioId });
    const eventos = await tx.obraEvento.findMany({
      where: { obraId, empresaId },
      include: { usuario: { select: { id: true, nome: true } } },
      orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
    });
    return { evento, timeline: formatarTimeline(eventos, papel) };
  }, { isolationLevel: "Serializable" });
}

function mesmoInstante(a, b) {
  return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
}

function formatarDataAgendamento(data) {
  const dataValida = normalizarData(data);
  if (!dataValida) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(dataValida);
}

function somarMesesPreservandoDia(dataInicial, quantidadeMeses) {
  const dia = dataInicial.getUTCDate();
  const resultado = new Date(Date.UTC(dataInicial.getUTCFullYear(), dataInicial.getUTCMonth() + quantidadeMeses, 1, 12));
  const ultimoDia = new Date(Date.UTC(resultado.getUTCFullYear(), resultado.getUTCMonth() + 1, 0)).getUTCDate();
  resultado.setUTCDate(Math.min(dia, ultimoDia));
  return resultado;
}

async function reagendarObra({ obraId, empresaId, administradorId, agendadaPara, prazoFinal }) {
  exigirBancoConfigurado();
  const prisma = getPrisma();
  // A data e o evento são gravados juntos para manter o histórico consistente.
  for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const obraAtual = await tx.obra.findFirst({
          where: { id: obraId, empresaId },
          select: { id: true, status: true, agendadaPara: true, prazoFinal: true },
        });
        if (!obraAtual) return null;

        // Obras iniciadas mantêm a data original e só aceitam mudar o prazo.
        if (obraAtual.status !== "AGENDADA" && !mesmoInstante(obraAtual.agendadaPara, agendadaPara)) {
          throw erroAgendamento("INICIO_OBRA_BLOQUEADO", "A data de início não pode ser alterada depois que a obra foi iniciada");
        }

        if (mesmoInstante(obraAtual.agendadaPara, agendadaPara) && mesmoInstante(obraAtual.prazoFinal, prazoFinal)) {
          const semAlteracao = await tx.obra.findFirst({
            where: { id: obraId, empresaId },
            include: incluirDadosDaObra(empresaId),
          });
          return {
            obra: formatarObra(semAlteracao, "ADMIN"),
            agendadaPara: obraAtual.agendadaPara,
            prazoFinal: obraAtual.prazoFinal,
            evento: null,
            alterada: false,
          };
        }

        await tx.obra.update({ where: { id: obraId }, data: { agendadaPara, prazoFinal } });
        const evento = await tx.obraEvento.create({
          data: {
            obraId,
            empresaId,
            usuarioId: administradorId,
            tipo: "AGENDAMENTO",
            descricao: `Obra reagendada para ${formatarDataAgendamento(agendadaPara)} até ${formatarDataAgendamento(prazoFinal)}.`,
            visivelParaCliente: true,
          },
        });
        await notificarEventoObra(tx, { obraId, empresaId, evento, autorId: administradorId });

        const atualizada = await tx.obra.findFirst({
          where: { id: obraId, empresaId },
          include: incluirDadosDaObra(empresaId),
        });
        return { obra: formatarObra(atualizada, "ADMIN"), agendadaPara, prazoFinal, evento, alterada: true };
      }, { isolationLevel: "Serializable" });
    } catch (erro) {
      if (erro.code !== "P2034") throw erro;
      if (tentativa === 3) {
        throw erroAgendamento("AGENDAMENTO_CONCORRENTE", "O agendamento foi alterado por outra operação; atualize e tente novamente");
      }
    }
  }
}

// Define os relacionamentos necessários para formar a resposta do frontend.
function incluirDadosDaObra(empresaId, tipo = "ADMIN") {
  return {
    // Busca os dados do cliente relacionado à obra.
    cliente: { select: tipo === "COLABORADOR" ? { empresaId: true, telefone: true } : { id: true, nome: true, empresaId: true } },
    // Busca as parcelas na ordem em que devem aparecer.
    parcelas: { orderBy: { numero: "asc" }, include: { pagamentos: { select: { valor: true, status: true } } } },
    // Busca eventos e autores da mesma empresa da obra.
    eventos: {
      where: { empresaId, usuario: { empresaId } },
      include: { usuario: { select: { nome: true } } },
      orderBy: { criadoEm: "asc" },
    },
    // Busca escalas abertas e funcionários da mesma empresa da obra.
    escalas: {
      where: { dataFim: null, funcionario: { empresaId } },
      include: { funcionario: { select: { id: true, nome: true, funcao: true, telefone: true } } },
      orderBy: [{ dataInicio: "asc" }, { id: "asc" }],
    },
    disponibilidades: {
      where: { empresaId, funcionario: { empresaId, ativo: true } },
      include: { funcionario: { select: { id: true, nome: true, funcao: true, telefone: true, fotoUrl: true, usuarioId: true } } },
      orderBy: [{ funcionario: { nome: "asc" } }, { diaSemana: "asc" }],
    },
    convites: {
      where: { tipo: "CLIENTE", usadoEm: null, expiraEm: { gt: new Date() } },
      select: { id: true },
    },
    contrato: { select: { id: true, termos: true, arquivoUrl: true, criadoEm: true } },
  };
}

// Normaliza os Date do PostgreSQL e as strings decodificadas de colunas JSONB.
function normalizarData(valor) {
  if (valor instanceof Date) return Number.isFinite(valor.getTime()) ? valor : null;
  if (typeof valor !== "string" || !valor.trim()) return null;

  let texto = valor.trim();
  texto = texto.replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:)/, "$1T$2");
  const dataSemHora = /^\d{4}-\d{2}-\d{2}$/;
  const dataHoraSemFuso = /^\d{4}-\d{2}-\d{2}T.*\d{2}:\d{2}/;
  const temFuso = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(texto);
  if (!temFuso && !dataSemHora.test(texto) && dataHoraSemFuso.test(texto)) texto += "Z";

  const data = new Date(texto);
  return Number.isFinite(data.getTime()) ? data : null;
}

// Converte datas do banco para o formato dia/mês/ano usado no mock.
function formatarData(valor) {
  const data = normalizarData(valor);
  if (!data) return null;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(data);
}

// Converte o estado interno da obra para o texto legível do frontend.
function formatarStatus(status) {
  // Relaciona os códigos do banco aos rótulos apresentados ao usuário.
  const rotulos = { AGENDADA: "Agendada", EM_ANDAMENTO: "Em andamento", AGUARDANDO_CONFERENCIA: "Aguardando conferência", CONCLUIDA: "Concluída" };
  // Usa o próprio valor como alternativa para estados ainda desconhecidos.
  return rotulos[status] || status;
}

// Calcula a situação padronizada da parcela reutilizando exatamente a regra de atraso do sistema.
function calcularSituacaoParcela(parcela, agora = new Date()) {
  // Normaliza a data de vencimento vinda do banco ou de JSON agregado.
  const vencimento = normalizarData(parcela?.vencimento);
  // Considera atrasada somente se não estiver paga e o vencimento já tiver passado.
  const emAtraso = parcela?.situacao !== "PAGA" && Boolean(vencimento && vencimento < agora);
  // Retorna "paga", "atrasada" ou "pendente" conforme o estado atual.
  return parcela?.situacao === "PAGA" ? "paga" : emAtraso ? "atrasada" : "pendente";
}

// Converte uma parcela bruta para o item resumido somente leitura exposto em resumoParcelas.
function formatarItemResumoParcela(parcela) {
  // Retorna nulo quando não houver parcela correspondente.
  if (!parcela) return null;
  // Reaproveita a regra oficial de cálculo de situação da parcela.
  const situacao = calcularSituacaoParcela(parcela);
  // Converte a situação para o rótulo padronizado da interface ("Pago", "Atrasada" ou "Pendente").
  const estado = situacao === "paga" ? "Pago" : situacao === "atrasada" ? "Atrasada" : "Pendente";
  // Devolve número, valor numérico, código da situação e rótulo do estado.
  return {
    numero: Number(parcela.numero),
    valor: Number(parcela.valor),
    situacao,
    estado,
  };
}

// Monta o campo somente leitura resumoParcelas a partir do agregado SQL da listagem ou das parcelas completas.
function formatarResumoParcelas(obra, parcelasOrdenadas = []) {
  // Quando a listagem SQL trouxe o agregado completo das parcelas da obra, usa esses dados.
  const agregadoSql = obra?.resumoParcelasSql;
  if (agregadoSql && typeof agregadoSql === "object") {
    // Ordena as até duas últimas parcelas pagas em ordem crescente pelo número.
    const ultimasPagas = (Array.isArray(agregadoSql.ultimasPagas) ? agregadoSql.ultimasPagas : [])
      .filter(Boolean)
      .sort((a, b) => Number(a.numero) - Number(b.numero));
    // Separa a última paga (maior número) e a penúltima paga (para quando todas estiverem pagas).
    const ultimaPagaBruta = ultimasPagas.length ? ultimasPagas[ultimasPagas.length - 1] : null;
    const penultimaPagaBruta = ultimasPagas.length >= 2 ? ultimasPagas[ultimasPagas.length - 2] : null;
    // Lê a próxima parcela não paga (menor número diferente de PAGA).
    const proximaNaoPagaBruta = agregadoSql.proximaNaoPaga || null;
    // Usa o total contado no banco (ou quantidade cadastrada na obra como alternativa).
    const total = Number(agregadoSql.total ?? obra.quantidadeParcelas ?? parcelasOrdenadas.length ?? 0);
    // Usa a contagem de parcelas quitadas retornada pela consulta.
    const pagas = Number(agregadoSql.pagas ?? 0);
    // Usa o valor real da primeira parcela para o cabeçalho (ex.: "12 parcelas de R$ X").
    const valorParcelaBase = agregadoSql.valorParcelaPadrao !== null && agregadoSql.valorParcelaPadrao !== undefined
      ? Number(agregadoSql.valorParcelaPadrao)
      : (parcelasOrdenadas[0] ? Number(parcelasOrdenadas[0].valor) : null);

    // Devolve o resumo somente leitura para os cartões da listagem.
    return {
      total,
      pagas,
      valorParcelaBase,
      ultimaPaga: formatarItemResumoParcela(ultimaPagaBruta),
      penultimaPaga: formatarItemResumoParcela(penultimaPagaBruta),
      proximaNaoPaga: formatarItemResumoParcela(proximaNaoPagaBruta),
    };
  }

  // Quando todas as parcelas já estão carregadas em memória (detalhes ou mocks), calcula diretamente delas.
  const pagasLista = parcelasOrdenadas.filter((parcela) => parcela?.situacao === "PAGA");
  const naoPagasLista = parcelasOrdenadas.filter((parcela) => parcela?.situacao !== "PAGA");
  // Calcula total de parcelas existentes ou cadastradas na obra.
  const total = parcelasOrdenadas.length || Number(obra?.quantidadeParcelas || 0);
  // Identifica a última paga, a penúltima paga e a próxima não paga.
  const ultimaPagaBruta = pagasLista.length ? pagasLista[pagasLista.length - 1] : null;
  const penultimaPagaBruta = pagasLista.length >= 2 ? pagasLista[pagasLista.length - 2] : null;
  const proximaNaoPagaBruta = naoPagasLista.length ? naoPagasLista[0] : null;
  // Mantém o valor real da primeira parcela como valor base do cabeçalho.
  const valorParcelaBase = parcelasOrdenadas[0] ? Number(parcelasOrdenadas[0].valor) : null;

  // Devolve o mesmo contrato somente leitura.
  return {
    total,
    pagas: pagasLista.length,
    valorParcelaBase,
    ultimaPaga: formatarItemResumoParcela(ultimaPagaBruta),
    penultimaPaga: formatarItemResumoParcela(penultimaPagaBruta),
    proximaNaoPaga: formatarItemResumoParcela(proximaNaoPagaBruta),
  };
}

// Converte uma parcela do banco para o mesmo formato do mock.
function formatarParcela(parcela) {
  // Retorna nulo quando a obra não possui esta parcela.
  if (!parcela) return null;
  const vencimento = normalizarData(parcela.vencimento);
  const pagaEm = normalizarData(parcela.pagaEm);
  const comprovanteEnviadoEm = normalizarData(parcela.comprovanteEnviadoEm);
  // Prepara a parcela com número, valor numérico e situação legível.
  const valor = Number(parcela.valor);
  const pagamentos = Array.isArray(parcela.pagamentos) ? parcela.pagamentos.filter(Boolean) : [];
  // Expõe um indicador sem revelar registros ou estados financeiros adicionais.
  const temMovimentoPagamento = Boolean(parcela.temMovimentoPagamento)
    || parcela.situacao === "PAGA"
    || Boolean(pagaEm || parcela.comprovanteUrl || comprovanteEnviadoEm || parcela.pagamentoExternoId || pagamentos.length);
  const aprovado = pagamentos.filter((pagamento) => pagamento.status === "APROVADO").reduce((total, pagamento) => total + Number(pagamento.valor), 0);
  const reservado = pagamentos.filter((pagamento) => pagamento.status === "PENDENTE").reduce((total, pagamento) => total + Number(pagamento.valor), 0);
  // Saldo devedor considera apenas aprovações; reservas são informadas separadamente.
  const saldoDevedor = parcela.situacao === "PAGA" ? 0 : Math.max(0, valor - aprovado);
  const saldoDisponivel = Math.max(0, saldoDevedor - reservado);
  const situacao = calcularSituacaoParcela(parcela);
  const resposta = { id: parcela.id, numero: parcela.numero, valor, situacao, valorPago: parcela.situacao === "PAGA" ? valor : aprovado, valorReservado: reservado, saldoDevedor, saldoDisponivel, vencimento: formatarData(vencimento), vencimentoISO: vencimento ? vencimento.toISOString().slice(0, 10) : "", comprovanteUrl: parcela.comprovanteUrl, tentativasPendentes: pagamentos.filter((pagamento) => pagamento.status === "PENDENTE").map((pagamento) => ({ id: pagamento.id, valor: Number(pagamento.valor) })), temMovimentoPagamento };
  // Inclui a data do pagamento quando a parcela foi quitada.
  if (pagaEm) resposta.pagamento = formatarData(pagaEm);
  // Inclui quando o cliente enviou um comprovante.
  if (comprovanteEnviadoEm) resposta.comprovanteEnviadoEm = formatarData(comprovanteEnviadoEm);
  // Devolve a parcela no formato usado pelo mock.
  return resposta;
}

// Oculta valores em reais nas descrições enviadas a colaboradores.
function ocultarValoresFinanceiros(descricao) {
  return descricao.replace(/R\$\s?\d[\d.,]*/gi, "[valor oculto]");
}

// Converte uma obra com relações para os nomes de campo usados no mock.
function formatarTimeline(eventos, tipo) {
  return (Array.isArray(eventos) ? eventos : [])
    .filter((evento) => evento && (tipo === "CLIENTE" ? evento.visivelParaCliente : tipo === "COLABORADOR" ? !["PAGAMENTO", "ORCAMENTO_APROVADO", "CONTRATACAO"].includes(evento.tipo) : true))
    .sort((a, b) => (normalizarData(a.criadoEm)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (normalizarData(b.criadoEm)?.getTime() ?? Number.MAX_SAFE_INTEGER))
    .map((evento) => {
      const criadoEm = normalizarData(evento.criadoEm);
      return {
        id: evento.id,
        data: formatarData(criadoEm),
        hora: criadoEm ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(criadoEm) : "",
        autor: evento.usuario?.nome || evento.autor?.nome || "Sistema",
        tipo: String(evento.tipo || "").toLowerCase(),
        descricao: tipo === "COLABORADOR" ? ocultarValoresFinanceiros(String(evento.descricao || "")) : String(evento.descricao || ""),
        fotoUrl: evento.fotoUrl,
        visivelParaCliente: evento.visivelParaCliente,
      };
    });
}

function formatarObra(obra, tipo) {
  // Ordena as parcelas já consultadas pelo número sequencial.
  const parcelas = [...(Array.isArray(obra.parcelas) ? obra.parcelas.filter(Boolean) : [])].sort((a, b) => Number(a.numero) - Number(b.numero));
  const prazoFinal = normalizarData(obra.prazoFinal);
  const agendadaPara = normalizarData(obra.agendadaPara);
  const conclusaoConfirmadaEm = normalizarData(obra.conclusaoConfirmadaEm);
  const contrato = obra.contrato ? { ...obra.contrato, criadoEm: normalizarData(obra.contrato.criadoEm)?.toISOString() || null } : null;
  const escalas = Array.isArray(obra.escalas) ? obra.escalas.filter((escala) => escala?.funcionario) : [];
  const disponibilidades = Array.isArray(obra.disponibilidades) ? obra.disponibilidades.filter((item) => item?.funcionario) : [];
  // Prepara os campos gerais da resposta da obra.
  const resposta = {
    // Preserva o identificador da obra no banco.
    id: obra.id,
    // Renomeia o nome armazenado para o título do mock.
    titulo: obra.nome,
    ...(tipo !== "COLABORADOR" ? { clienteId: obra.clienteId } : {}),
    descricao: obra.descricao,
    // Não expõe o perfil do cliente ao gerente, somente o telefone de contato.
    ...(tipo !== "COLABORADOR" ? { cliente: obra.cliente?.empresaId === obra.empresaId ? obra.cliente.nome || null : null } : {}),
    // Apresenta os nomes dos funcionários atualmente escalados.
    colaboradores: escalas.map((escala) => ({ id: escala.funcionario.id, nome: escala.funcionario.nome, funcao: escala.funcionario.funcao, ...(tipo === "ADMIN" ? { telefone: escala.funcionario.telefone } : {}) })),
    funcionariosProgramados: [...new Map(disponibilidades.map((item) => [item.funcionario.id, { id: item.funcionario.id, nome: item.funcionario.nome, funcao: item.funcionario.funcao, telefone: tipo === "ADMIN" ? item.funcionario.telefone : undefined, fotoUrl: item.funcionario.fotoUrl, diasSemana: disponibilidades.filter((dia) => dia.funcionarioId === item.funcionarioId).map((dia) => dia.diaSemana) }])).values()],
    // Preserva o endereço cadastrado.
    endereco: [obra.endereco, obra.numero, obra.semApartamento ? null : obra.apartamento ? `Apto ${obra.apartamento}` : null, obra.semBloco ? null : obra.bloco ? `Bloco ${obra.bloco}` : null, obra.bairro, obra.cidade, obra.estado].filter(Boolean).join(" - ") || obra.endereco,
    enderecoBase: obra.endereco,
    estado: obra.estado,
    cidade: obra.cidade,
    bairro: obra.bairro,
    numero: obra.numero,
    apartamento: obra.apartamento,
    bloco: obra.bloco,
    semApartamento: obra.semApartamento,
    semBloco: obra.semBloco,
    fotos: obra.fotos || [],
    // Converte o estado para uma descrição legível.
    status: formatarStatus(obra.status),
    // Converte o prazo para o padrão de data do mock.
    prazo: formatarData(prazoFinal),
    prazoISO: prazoFinal?.toISOString().slice(0, 10) || "",
    agendadaPara: agendadaPara?.toISOString().slice(0, 10) || null,
    agendadaParaISO: agendadaPara?.toISOString().slice(0, 10) || "",
    conclusaoConfirmadaEm: conclusaoConfirmadaEm?.toISOString() || null,
    // Adapta os eventos ao formato da linha do tempo do mock.
    timeline: formatarTimeline(obra.eventos || [], tipo),
  };
  if (tipo === "COLABORADOR" && obra.cliente?.empresaId === obra.empresaId) resposta.telefoneCliente = obra.cliente.telefone || null;
  if (tipo !== "CLIENTE") resposta.informacoesAdicionais = obra.informacoesAdicionais;
  if (tipo === "ADMIN") resposta.conviteClientePendente = Boolean(obra.convites?.length);
  if (tipo !== "COLABORADOR") resposta.contrato = contrato;
  // Inclui dados financeiros apenas para clientes e administradores.
  if (tipo !== "COLABORADOR") {
    // Converte o valor Decimal para número compatível com JSON.
    resposta.valorTotal = Number(obra.valorTotal);
    resposta.quantidadeParcelas = obra.quantidadeParcelas || parcelas.length;
    resposta.taxaJurosMensal = Number(obra.taxaJurosMensal || 0);
    resposta.valorBase = Number(obra.valorBase || obra.valorTotal);
    resposta.parcelas = parcelas.map(formatarParcela);
    // Adiciona campo novo somente leitura com o resumo agregado das parcelas (não exposto ao colaborador).
    resposta.resumoParcelas = formatarResumoParcelas(obra, parcelas);
    resposta.resumoFinanceiro = `Contrato fechado com divisão em (${obra.quantidadeParcelas || parcelas.length}) etapas`;
    // Converte a primeira parcela para o campo usado pelo mock.
    resposta.parcela1 = formatarParcela(parcelas[0]);
    // Converte a segunda parcela para o campo usado pelo mock.
    resposta.parcela2 = formatarParcela(parcelas[1]);
  }
  // Devolve o objeto final da obra.
  return resposta;
}

function jsonCliente(tipo) {
  if (tipo === "COLABORADOR") {
    return Prisma.sql`CASE WHEN cliente.id IS NULL THEN NULL ELSE jsonb_build_object('empresaId', cliente."empresaId", 'telefone', cliente.telefone) END`;
  }
  return Prisma.sql`CASE WHEN cliente.id IS NULL THEN NULL ELSE jsonb_build_object('id', cliente.id, 'nome', cliente.nome, 'empresaId', cliente."empresaId") END`;
}

function jsonEventos(empresaId, limitar) {
  const limite = limitar ? Prisma.sql`ORDER BY e."criadoEm" DESC LIMIT 10` : Prisma.empty;
  return Prisma.sql`COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', evento.id,
      'criadoEm', evento."criadoEm",
      'tipo', evento.tipo,
      'descricao', evento.descricao,
      'fotoUrl', evento."fotoUrl",
      'visivelParaCliente', evento."visivelParaCliente",
      'usuario', jsonb_build_object('nome', evento."autorNome")
    ) ORDER BY evento."criadoEm" ASC)
    FROM (
      SELECT e.id, e."criadoEm", e.tipo, e.descricao, e."fotoUrl", e."visivelParaCliente", u.nome AS "autorNome"
      FROM "ObraEvento" e
      JOIN "Usuario" u ON u.id = e."usuarioId" AND u."empresaId" = ${empresaId}
      WHERE e."obraId" = o.id AND e."empresaId" = ${empresaId}
      ${limite}
    ) evento
  ), '[]'::jsonb)`;
}

// Agrega em JSON somente os dados necessários para montar resumoParcelas na listagem GET /obras.
function jsonResumoParcelas() {
  return Prisma.sql`jsonb_build_object(
    'total', (SELECT COUNT(*)::int FROM "Parcela" p WHERE p."obraId" = o.id),
    'pagas', (SELECT COUNT(*)::int FROM "Parcela" p WHERE p."obraId" = o.id AND p.situacao = 'PAGA'),
    'valorParcelaPadrao', (SELECT p0.valor FROM "Parcela" p0 WHERE p0."obraId" = o.id ORDER BY p0.numero ASC LIMIT 1),
    'ultimasPagas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('numero', p1.numero, 'valor', p1.valor, 'situacao', p1.situacao, 'vencimento', p1.vencimento) ORDER BY p1.numero ASC)
      FROM (
        SELECT p.numero, p.valor, p.situacao, p.vencimento
        FROM "Parcela" p
        WHERE p."obraId" = o.id AND p.situacao = 'PAGA'
        ORDER BY p.numero DESC
        LIMIT 2
      ) p1
    ), '[]'::jsonb),
    'proximaNaoPaga', (
      SELECT jsonb_build_object('numero', p2.numero, 'valor', p2.valor, 'situacao', p2.situacao, 'vencimento', p2.vencimento)
      FROM "Parcela" p2
      WHERE p2."obraId" = o.id AND p2.situacao <> 'PAGA'
      ORDER BY p2.numero ASC
      LIMIT 1
    )
  )`;
}

function jsonParcelas(limitar) {
  const filtroNumero = limitar ? Prisma.sql`AND p.numero <= 2` : Prisma.empty;
  const limite = limitar ? Prisma.sql`LIMIT 2` : Prisma.empty;
  return Prisma.sql`COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', parcela.id,
      'numero', parcela.numero,
      'valor', parcela.valor,
      'situacao', parcela.situacao,
      'vencimento', parcela.vencimento,
      'pagaEm', parcela."pagaEm",
      'comprovanteUrl', parcela."comprovanteUrl",
      'comprovanteEnviadoEm', parcela."comprovanteEnviadoEm",
      'pagamentoExternoId', parcela."pagamentoExternoId",
      'temMovimentoPagamento', (parcela.situacao = 'PAGA' OR parcela."pagaEm" IS NOT NULL OR parcela."comprovanteUrl" IS NOT NULL OR parcela."comprovanteEnviadoEm" IS NOT NULL OR parcela."pagamentoExternoId" IS NOT NULL OR EXISTS (SELECT 1 FROM "Pagamento" mov WHERE mov."parcelaId" = parcela.id)),
      'pagamentos', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id', pagamento.id, 'valor', pagamento.valor, 'status', pagamento.status))
        FROM "Pagamento" pagamento
        WHERE pagamento."parcelaId" = parcela.id AND pagamento.status IN ('APROVADO', 'PENDENTE')
      ), '[]'::jsonb)
    ) ORDER BY parcela.numero ASC)
    FROM (
      SELECT p.id, p.numero, p.valor, p.situacao, p.vencimento, p."pagaEm", p."comprovanteUrl", p."comprovanteEnviadoEm", p."pagamentoExternoId"
      FROM "Parcela" p
      WHERE p."obraId" = o.id ${filtroNumero}
      ORDER BY p.numero ASC ${limite}
    ) parcela
  ), '[]'::jsonb)`;
}

function jsonEscalas(empresaId, tipo) {
  const telefone = tipo === "ADMIN" ? Prisma.sql`, 'telefone', f.telefone` : Prisma.empty;
  return Prisma.sql`COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'dataInicio', escala."dataInicio",
      'funcionario', jsonb_build_object('id', f.id, 'nome', f.nome, 'funcao', f.funcao ${telefone})
    ) ORDER BY escala."dataInicio" ASC, escala.id ASC)
    FROM "ObraEscala" escala
    JOIN "Funcionario" f ON f.id = escala."funcionarioId" AND f."empresaId" = ${empresaId}
    WHERE escala."obraId" = o.id AND escala."dataFim" IS NULL
  ), '[]'::jsonb)`;
}

function jsonDisponibilidades(empresaId, tipo) {
  const telefone = tipo === "ADMIN" ? Prisma.sql`, 'telefone', f.telefone` : Prisma.empty;
  return Prisma.sql`COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'funcionarioId', disponibilidade."funcionarioId",
      'diaSemana', disponibilidade."diaSemana",
      'funcionario', jsonb_build_object(
        'id', f.id, 'nome', f.nome, 'funcao', f.funcao ${telefone},
        'fotoUrl', f."fotoUrl", 'usuarioId', f."usuarioId"
      )
    ) ORDER BY f.nome ASC, disponibilidade."diaSemana" ASC)
    FROM "DisponibilidadeFuncionario" disponibilidade
    JOIN "Funcionario" f ON f.id = disponibilidade."funcionarioId" AND f."empresaId" = ${empresaId} AND f.ativo = TRUE
    WHERE disponibilidade."obraId" = o.id AND disponibilidade."empresaId" = ${empresaId}
  ), '[]'::jsonb)`;
}

function jsonConvites() {
  return Prisma.sql`COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', convite.id))
    FROM "Convite" convite
    WHERE convite."obraId" = o.id AND convite.tipo = 'CLIENTE' AND convite."usadoEm" IS NULL AND convite."expiraEm" > NOW()
  ), '[]'::jsonb)`;
}

function jsonContrato() {
  return Prisma.sql`(
    SELECT jsonb_build_object('id', contrato.id, 'termos', contrato.termos, 'arquivoUrl', contrato."arquivoUrl", 'criadoEm', contrato."criadoEm")
    FROM "Contrato" contrato WHERE contrato."obraId" = o.id LIMIT 1
  )`;
}

function consultaListaObras(empresaId, usuarioId, tipo, { incluirArquivadas = false, detalhesCompletos = false } = {}) {
  const colunas = [
    Prisma.sql`o.id`, Prisma.sql`o."empresaId"`, Prisma.sql`o.nome`, Prisma.sql`o."clienteId"`, Prisma.sql`o.descricao`,
    Prisma.sql`o.endereco`, Prisma.sql`o.estado`, Prisma.sql`o.cidade`, Prisma.sql`o.bairro`, Prisma.sql`o.numero`,
    Prisma.sql`o.apartamento`, Prisma.sql`o.bloco`, Prisma.sql`o."semApartamento"`, Prisma.sql`o."semBloco"`,
    Prisma.sql`o.fotos`, Prisma.sql`o.status`, Prisma.sql`o."prazoFinal"`, Prisma.sql`o."agendadaPara"`,
    Prisma.sql`o."conclusaoConfirmadaEm"`, Prisma.sql`${jsonCliente(tipo)} AS cliente`,
    Prisma.sql`${jsonEventos(empresaId, !detalhesCompletos)} AS eventos`,
  ];
  if (incluirArquivadas) colunas.push(Prisma.sql`o."excluidaEm"`, Prisma.sql`o."exclusaoExpiraEm"`, Prisma.sql`o."exclusaoMotivo"`);
  if (tipo !== "CLIENTE") colunas.push(Prisma.sql`o."informacoesAdicionais"`);
  if (tipo !== "COLABORADOR") {
    colunas.push(
      Prisma.sql`o."valorTotal"`, Prisma.sql`o."valorBase"`, Prisma.sql`o."quantidadeParcelas"`, Prisma.sql`o."taxaJurosMensal"`,
      Prisma.sql`${jsonParcelas(!detalhesCompletos)} AS parcelas`,
      // Inclui agregado somente leitura de todas as parcelas na listagem sem alterar o campo parcelas existente.
      Prisma.sql`${jsonResumoParcelas()} AS "resumoParcelasSql"`,
    );
  }
  colunas.push(Prisma.sql`${jsonEscalas(empresaId, tipo)} AS escalas`);
  if (detalhesCompletos) colunas.push(Prisma.sql`${jsonDisponibilidades(empresaId, tipo)} AS disponibilidades`);
  if (tipo === "ADMIN") colunas.push(Prisma.sql`${jsonConvites()} AS convites`);
  if (tipo === "CLIENTE" || detalhesCompletos) colunas.push(Prisma.sql`${jsonContrato()} AS contrato`);

  const filtroCliente = tipo === "CLIENTE" ? Prisma.sql`AND o."clienteId" = ${usuarioId}` : Prisma.empty;
  const filtroColaborador = tipo === "COLABORADOR" ? Prisma.sql`AND EXISTS (
    SELECT 1 FROM "ObraEscala" acesso
    JOIN "Funcionario" funcionario ON funcionario.id = acesso."funcionarioId"
    WHERE acesso."obraId" = o.id AND acesso."dataFim" IS NULL
      AND funcionario."usuarioId" = ${usuarioId} AND funcionario."empresaId" = ${empresaId}
  )` : Prisma.empty;
  const ordenacao = tipo === "COLABORADOR" ? Prisma.sql`o.id ASC` : Prisma.sql`o."criadoEm" DESC`;
  const filtroExclusao = incluirArquivadas ? Prisma.sql`AND o."excluidaEm" IS NOT NULL` : Prisma.sql`AND o."excluidaEm" IS NULL`;
  const ordemFinal = incluirArquivadas ? Prisma.sql`o."excluidaEm" DESC` : ordenacao;

  return Prisma.sql`SELECT ${Prisma.join(colunas)}
    FROM "Obra" o
    LEFT JOIN "Usuario" cliente ON cliente.id = o."clienteId"
    WHERE o."empresaId" = ${empresaId} ${filtroExclusao}
      ${filtroCliente} ${filtroColaborador}
    ORDER BY ${ordemFinal}`;
}

function consultaDetalheObra(id, empresaId, usuarioId, tipo) {
  const colunas = [
    Prisma.sql`o.id`, Prisma.sql`o."empresaId"`, Prisma.sql`o.nome`, Prisma.sql`o."clienteId"`, Prisma.sql`o.descricao`,
    Prisma.sql`o.endereco`, Prisma.sql`o.estado`, Prisma.sql`o.cidade`, Prisma.sql`o.bairro`, Prisma.sql`o.numero`,
    Prisma.sql`o.apartamento`, Prisma.sql`o.bloco`, Prisma.sql`o."semApartamento"`, Prisma.sql`o."semBloco"`,
    Prisma.sql`o.fotos`, Prisma.sql`o.status`, Prisma.sql`o."prazoFinal"`, Prisma.sql`o."agendadaPara"`,
    Prisma.sql`o."conclusaoConfirmadaEm"`, Prisma.sql`o."informacoesAdicionais"`,
    Prisma.sql`${jsonCliente(tipo)} AS cliente`, Prisma.sql`${jsonEventos(empresaId, false)} AS eventos`,
    Prisma.sql`${jsonEscalas(empresaId, tipo)} AS escalas`, Prisma.sql`${jsonDisponibilidades(empresaId, tipo)} AS disponibilidades`,
  ];
  if (tipo !== "COLABORADOR") {
    colunas.push(
      Prisma.sql`o."valorTotal"`, Prisma.sql`o."valorBase"`, Prisma.sql`o."quantidadeParcelas"`, Prisma.sql`o."taxaJurosMensal"`,
      Prisma.sql`${jsonParcelas(false)} AS parcelas`, Prisma.sql`${jsonContrato()} AS contrato`,
    );
  }
  if (tipo === "ADMIN") colunas.push(Prisma.sql`${jsonConvites()} AS convites`);

  const filtroCliente = tipo === "CLIENTE" ? Prisma.sql`AND o."clienteId" = ${usuarioId}` : Prisma.empty;
  const filtroColaborador = tipo === "COLABORADOR" ? Prisma.sql`AND EXISTS (
    SELECT 1 FROM "ObraEscala" acesso
    JOIN "Funcionario" funcionario ON funcionario.id = acesso."funcionarioId"
    WHERE acesso."obraId" = o.id AND acesso."dataFim" IS NULL
      AND funcionario."usuarioId" = ${usuarioId} AND funcionario."empresaId" = ${empresaId}
  )` : Prisma.empty;

  return Prisma.sql`SELECT ${Prisma.join(colunas)}
    FROM "Obra" o
    LEFT JOIN "Usuario" cliente ON cliente.id = o."clienteId"
    WHERE o.id = ${id} AND o."empresaId" = ${empresaId} AND o."excluidaEm" IS NULL
      ${filtroCliente} ${filtroColaborador}
    LIMIT 1`;
}

// Busca as obras da empresa e aplica o filtro específico do perfil.
async function listarObras(empresaId, usuarioId, tipo) {
  // Confirma que o banco pode receber consultas.
  exigirBancoConfigurado();
  // Uma instrução agrega as relações em JSON e aplica o escopo no próprio banco.
  const obras = await getPrisma().$queryRaw(consultaListaObras(empresaId, usuarioId, tipo));
  // Devolve cada obra no formato do frontend e com a timeline filtrada.
  if (tipo === "COLABORADOR") {
    obras.sort((a, b) => (normalizarData(a.escalas?.[0]?.dataInicio)?.getTime() ?? 0) - (normalizarData(b.escalas?.[0]?.dataInicio)?.getTime() ?? 0) || a.id.localeCompare(b.id));
    return obras.map((obra, indice) => ({ ...formatarObra(obra, tipo), numeroObra: indice + 1 }));
  }
  return obras.map((obra) => formatarObra(obra, tipo));
}

// Busca uma obra somente dentro da empresa do token.
async function buscarObraPorId(id, empresaId, usuarioId, tipo) {
  // Confirma que o banco pode receber consultas.
  exigirBancoConfigurado();
  // Começa o filtro pelo identificador da obra e da empresa.
  // A única consulta inclui os dados relacionados e conserva os filtros de acesso.
  const [obra] = await getPrisma().$queryRaw(consultaDetalheObra(id, empresaId, usuarioId, tipo));
  // Converte a obra encontrada ou preserva o nulo para a rota responder 404.
  return obra ? formatarObra(obra, tipo) : null;
}

// Cria uma obra com os dados aceitos atualmente pela rota POST.
async function criarObra({ empresaId, administradorId, nome, descricao, endereco, estado, cidade, bairro, numero, apartamento, bloco, semApartamento, semBloco, informacoesAdicionais, valorBase, valorTotal, prazoFinal, clienteId = null, quantidadeParcelas = 2, vencimentoInicial = null, fotos = [] }) {
  // Confirma que o banco pode receber gravações.
  exigirBancoConfigurado();
  const quantidade = Math.min(36, Math.max(1, Number(quantidadeParcelas) || 2));
  const base = Number(valorBase ?? valorTotal);
  const taxa = quantidade > 12 ? 1 : 0;
  const valor = Math.round(base * (1 + (taxa / 100) * Math.max(0, quantidade - 12)) * 100) / 100;
  const hoje = new Date();
  const primeiraData = vencimentoInicial ? new Date(`${vencimentoInicial}T12:00:00.000Z`) : new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 10, 12));
  const valoresParcelas = Array.from({ length: quantidade }, () => Math.round((valor / quantidade) * 100) / 100);
  valoresParcelas[valoresParcelas.length - 1] = Math.round((valor - valoresParcelas.slice(0, -1).reduce((soma, n) => soma + n, 0)) * 100) / 100;
  return getPrisma().$transaction(async (tx) => {
    const obra = await tx.obra.create({ data: {
      empresaId, nome, descricao, endereco, estado, cidade, bairro, numero, apartamento, bloco,
      semApartamento: Boolean(semApartamento), semBloco: Boolean(semBloco), informacoesAdicionais,
      valorTotal: valor.toFixed(2), valorBase: base.toFixed(2), quantidadeParcelas: quantidade, taxaJurosMensal: taxa, prazoFinal, clienteId, fotos,
      parcelas: { create: valoresParcelas.map((valorParcela, indice) => ({ numero: indice + 1, valor: valorParcela.toFixed(2), vencimento: somarMesesPreservandoDia(primeiraData, indice) })) },
    } });
    const evento = await tx.obraEvento.create({ data: { obraId: obra.id, empresaId, usuarioId: administradorId, tipo: "STATUS", descricao: "Obra criada pela empreiteira.", visivelParaCliente: true } });
    await notificarEventoObra(tx, { obraId: obra.id, empresaId, evento, autorId: administradorId });
    return obra;
  });
}

async function arquivarObra({ obraId, empresaId, administradorId, motivo }) {
  exigirBancoConfigurado();
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const obra = await tx.obra.findFirst({ where: { id: obraId, empresaId, excluidaEm: null }, select: { id: true, status: true } });
    if (!obra) return null;
    if (obra.status === "EM_ANDAMENTO") throw erroConclusao("OBRA_EM_EXECUCAO", "Não é permitido excluir uma obra em andamento");
    if (obra.status !== "AGENDADA") throw erroConclusao("OBRA_NAO_AGENDADA", "Somente obras agendadas podem ser arquivadas; solicite a conferência e aguarde o aceite do cliente para encerrar a execução");
    const parcelas = await tx.parcela.findMany({ where: { obraId }, include: { pagamentos: { select: { id: true, status: true } } } });
    if (parcelas.some((parcela) => parcela.situacao === "PAGA" || parcela.pagamentos.some((pagamento) => ["APROVADO", "PENDENTE"].includes(pagamento.status)))) throw erroConclusao("PAGAMENTO_RECEBIDO", "Não é permitido excluir uma obra que já recebeu ou tem pagamento em processamento");
    const agora = new Date();
    const arquivada = await tx.obra.update({ where: { id: obraId }, data: { excluidaEm: agora, exclusaoExpiraEm: new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000), exclusaoMotivo: motivo } });
    const evento = await tx.obraEvento.create({ data: { obraId, empresaId, usuarioId: administradorId, tipo: "STATUS", descricao: "Obra agendada arquivada pela empreiteira.", visivelParaCliente: true } });
    await notificarEventoObra(tx, { obraId, empresaId, evento, autorId: administradorId });
    return arquivada;
  }, { isolationLevel: "Serializable" });
}

async function restaurarObra({ obraId, empresaId }) {
  exigirBancoConfigurado();
  const prisma = getPrisma();
  const obra = await prisma.obra.findFirst({ where: { id: obraId, empresaId, excluidaEm: { not: null } } });
  if (!obra) return null;
  if (!obra.exclusaoExpiraEm || obra.exclusaoExpiraEm <= new Date()) throw erroConclusao("PRAZO_RESTAURACAO_EXPIRADO", "O prazo de restauração de sete dias expirou");
  return prisma.obra.update({ where: { id: obraId }, data: { excluidaEm: null, exclusaoExpiraEm: null } });
}

async function listarObrasArquivadas(empresaId) {
  exigirBancoConfigurado();
  const obras = await getPrisma().$queryRaw(consultaListaObras(empresaId, null, "ADMIN", { incluirArquivadas: true, detalhesCompletos: true }));
  return obras.map((obra) => ({ ...formatarObra(obra, "ADMIN"), exclusaoMotivo: obra.exclusaoMotivo, excluidaEm: obra.excluidaEm, exclusaoExpiraEm: obra.exclusaoExpiraEm, restauravel: Boolean(obra.exclusaoExpiraEm && obra.exclusaoExpiraEm > new Date()) }));
}

async function anexarFotoObra({ obraId, empresaId, administradorId, fotoUrl }) {
  exigirBancoConfigurado();
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const obra = await tx.obra.findFirst({ where: { id: obraId, empresaId }, select: { id: true } });
    if (!obra) return null;
    const atualizada = await tx.obra.update({ where: { id: obraId }, data: { fotos: { push: fotoUrl } } });
    const evento = await tx.obraEvento.create({ data: { obraId, empresaId, usuarioId: administradorId, tipo: "FOTO", descricao: "Foto adicionada às informações da obra.", fotoUrl, visivelParaCliente: true } });
    await notificarEventoObra(tx, { obraId, empresaId, evento, autorId: administradorId });
    return atualizada;
  });
}

async function salvarContratoObra({ obraId, empresaId, administradorId, termos, arquivoUrl }) {
  exigirBancoConfigurado();
  const prisma = getPrisma();
  const obra = await prisma.obra.findFirst({ where: { id: obraId, empresaId }, select: { id: true } });
  if (!obra) return null;
  return prisma.$transaction(async (tx) => {
    const contrato = await tx.contrato.upsert({ where: { obraId }, create: { obraId, empresaId, termos, arquivoUrl }, update: { termos, arquivoUrl } });
    const evento = await tx.obraEvento.create({ data: { obraId, empresaId, usuarioId: administradorId, tipo: "CONTRATO", descricao: "Contrato da obra adicionado ou atualizado.", visivelParaCliente: true } });
    await notificarEventoObra(tx, { obraId, empresaId, evento, autorId: administradorId });
    return contrato;
  });
}

// Atualiza somente os vencimentos dentro da transação recebida pelo chamador.
async function atualizarVencimentosParcelasNaTransacao(tx, { obra, obraId, empresaId, administradorId, vencimentoInicial }) {
  // Devolve nulo se a consulta de escopo não encontrou a obra.
  if (!obra) return null;
  // Lê todas as parcelas e qualquer registro de pagamento na mesma transação.
  const parcelas = await tx.parcela.findMany({
    where: { obraId },
    include: { pagamentos: { select: { id: true } } },
    orderBy: { numero: "asc" },
  });
  // Localiza a primeira parcela como origem do novo calendário.
  const primeiraParcela = parcelas.find((parcela) => Number(parcela.numero) === 1);
  // Impede salvar uma data quando a obra ainda não tem a parcela obrigatória.
  if (!primeiraParcela) {
    const erro = new Error("Não foi possível localizar a primeira parcela desta obra.");
    erro.code = "PARCELA_UM_NAO_ENCONTRADA";
    throw erro;
  }
  // Aplica o bloqueio do status e da ausência de movimento de pagamento.
  if (obra.status !== "AGENDADA" || !obraSemMovimentoDePagamento({ parcelas })) throw erroVencimentoObra();
  // Guarda a data antiga para o histórico sem expor outros dados da parcela.
  const vencimentoAnterior = primeiraParcela.vencimento ? formatarData(primeiraParcela.vencimento) : "não informado";
  // Atualiza a data de cada parcela sem tocar em número, valor ou obra.
  for (let indice = 0; indice < parcelas.length; indice += 1) {
    // Preserva o dia original e limita o dia ao último dia de meses curtos.
    const vencimento = somarMesesPreservandoDia(vencimentoInicial, indice);
    // Grava somente o campo Parcela.vencimento.
    await tx.parcela.update({ where: { id: parcelas[indice].id }, data: { vencimento } });
  }
  // Formata a primeira data nova para o evento e a resposta.
  const vencimentoNovo = formatarData(vencimentoInicial);
  // Registra uma anotação própria que pode aparecer no histórico do cliente.
  const evento = await tx.obraEvento.create({ data: {
    obraId,
    empresaId,
    usuarioId: administradorId,
    tipo: "ANOTACAO",
    descricao: `Vencimento das parcelas alterado de ${vencimentoAnterior} para ${vencimentoNovo}.`,
    visivelParaCliente: true,
  } });
  // Cria notificações somente quando há um cliente vinculado à obra.
  if (obra.clienteId) await notificarEventoObra(tx, {
    obraId,
    empresaId,
    evento,
    autorId: administradorId,
    somenteCliente: true,
    descricaoNotificacao: `${vencimentoAnterior} → ${vencimentoNovo}`,
  });
  // Devolve apenas as datas e o evento criados nesta transação.
  return { obraId, vencimentoAnterior, vencimentoNovo, evento };
}

// Altera o calendário de parcelas sem recalcular valores ou quantidade.
async function atualizarVencimentoObra({ obraId, empresaId, administradorId, vencimentoInicial }) {
  // Confirma que o banco pode receber gravações.
  exigirBancoConfigurado();
  // Inicia uma transação serializável para concorrer com novas tentativas de pagamento.
  const prisma = getPrisma();
  return emTransacaoSerializavel(prisma, async (tx) => {
    // Localiza a obra pela empresa e lê o estado necessário para a regra.
    const obra = await tx.obra.findFirst({
      where: { id: obraId, empresaId, excluidaEm: null },
      select: { id: true, status: true, clienteId: true },
    });
    // Atualiza datas, evento e notificação na mesma transação.
    return atualizarVencimentosParcelasNaTransacao(tx, { obra, obraId, empresaId, administradorId, vencimentoInicial });
  });
}

async function atualizarDadosObra({ obraId, empresaId, administradorId, dados }) {
  // Confirma que o banco pode receber alterações.
  exigirBancoConfigurado();
  // Obtém a instância compartilhada do Prisma.
  const prisma = getPrisma();
  // Guarda a data antes de removê-la dos campos gerais da obra.
  const vencimentoInicialSolicitado = dados.vencimentoInicial;
  // Usa uma transação serializável sempre que o PATCH também altera datas.
  const executar = async (tx) => {
    // Busca a obra pelo ID e pela empresa do administrador.
    const obra = await tx.obra.findFirst({
      where: { id: obraId, empresaId, excluidaEm: null },
      select: { id: true, status: true, clienteId: true, quantidadeParcelas: true, taxaJurosMensal: true, valorBase: true, valorTotal: true },
    });
    // Mantém o mesmo resultado de obra inexistente ou fora da empresa.
    if (!obra) return null;
    // Mantém o evento próprio de vencimento separado do evento de dados básicos.
    let eventoVencimento = null;
    // Valida e atualiza as datas pela mesma regra usada na rota dedicada.
    if (vencimentoInicialSolicitado !== undefined) {
      const alteracao = await atualizarVencimentosParcelasNaTransacao(tx, {
        obra,
        obraId,
        empresaId,
        administradorId,
        vencimentoInicial: vencimentoInicialSolicitado,
      });
      // Guarda o evento próprio para devolvê-lo mesmo em PATCH apenas de data.
      eventoVencimento = alteracao.evento;
      // Impede que o vencimento entre no update genérico da tabela Obra.
      delete dados.vencimentoInicial;
    }
    // Identifica somente os campos que recalculam valores e quantidade.
    const recalcularParcelas = dados.valorTotal !== undefined || dados.quantidadeParcelas !== undefined;
    // Preserva o bloqueio financeiro atual para alterações de valor e quantidade.
    if (recalcularParcelas) {
      // Carrega as parcelas atuais e suas tentativas, dentro desta transação.
      const parcelas = await tx.parcela.findMany({ where: { obraId }, include: { pagamentos: { select: { id: true } } }, orderBy: { numero: "asc" } });
      // Mantém a mensagem e a condição já existentes para bloqueio financeiro.
      if (parcelas.some((parcela) => parcela.situacao === "PAGA" || parcela.pagamentos.length > 0)) {
        const erro = new Error("Valor, quantidade e vencimentos não podem mudar depois de iniciada uma tentativa ou confirmado um pagamento");
        erro.code = "VALOR_OBRA_TRAVADO";
        throw erro;
      }
      // Escolhe a quantidade pedida ou mantém a quantidade persistida.
      const quantidade = Number(dados.quantidadeParcelas || obra.quantidadeParcelas || parcelas.length || 2);
      // Lê o valor base informado ou mantém o valor atual.
      const valorBase = Number(dados.valorTotal ?? (obra.valorBase || obra.valorTotal));
      // Preserva o acréscimo atual aplicado às parcelas além da décima segunda.
      const taxa = quantidade > 12 ? 1 : 0;
      // Calcula o valor final sem mudar a regra atual de juros.
      const valorFinal = Math.round(valorBase * (1 + (taxa / 100) * Math.max(0, quantidade - 12)) * 100) / 100;
      // Distribui o total entre as parcelas em centavos.
      const valores = Array.from({ length: quantidade }, () => Math.round((valorFinal / quantidade) * 100) / 100);
      // Ajusta a última parcela para fechar exatamente o valor final.
      valores[valores.length - 1] = Math.round((valorFinal - valores.slice(0, -1).reduce((soma, item) => soma + item, 0)) * 100) / 100;
      // Ancora a geração na data recém-informada ou na parcela número um atual.
      const primeiraParcela = parcelas.find((parcela) => Number(parcela.numero) === 1);
      const primeiraData = vencimentoInicialSolicitado || primeiraParcela?.vencimento || new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 10, 12));
      // Remove parcelas excedentes sem alterar o comportamento anterior.
      await tx.parcela.deleteMany({ where: { obraId, numero: { gt: quantidade } } });
      // Atualiza ou cria todas as parcelas da nova quantidade.
      for (let indice = 0; indice < quantidade; indice += 1) {
        // Gera o vencimento pelo mesmo calendário mensal do cadastro.
        const vencimento = somarMesesPreservandoDia(new Date(primeiraData), indice);
        // Atualiza número, valor e data das parcelas já existentes.
        if (parcelas[indice]) await tx.parcela.update({ where: { id: parcelas[indice].id }, data: { numero: indice + 1, valor: valores[indice].toFixed(2), vencimento } });
        // Cria as parcelas que ainda não existiam.
        else await tx.parcela.create({ data: { obraId, numero: indice + 1, valor: valores[indice].toFixed(2), vencimento } });
      }
      // Mantém os totais persistidos conforme a regra atual.
      dados.valorBase = valorBase.toFixed(2);
      dados.valorTotal = valorFinal.toFixed(2);
      dados.quantidadeParcelas = quantidade;
      dados.taxaJurosMensal = taxa.toFixed(2);
    }
    // PATCH somente de vencimento não precisa atualizar nem gerar evento genérico.
    if (Object.keys(dados).length === 0) {
      // Busca os dados atualizados para manter o formato de resposta existente.
      const obraAtualizada = await tx.obra.findFirst({ where: { id: obraId, empresaId } });
      // Devolve o evento próprio sem criar um evento genérico de dados básicos.
      return { obra: obraAtualizada, evento: eventoVencimento };
    }
    // Atualiza os campos gerais que restaram no corpo do PATCH.
    const atualizada = await tx.obra.update({ where: { id: obraId }, data: dados });
    // Mantém o evento genérico somente para campos básicos ou financeiros.
    const evento = await tx.obraEvento.create({
      data: { obraId, empresaId, usuarioId: administradorId, tipo: "ANOTACAO", descricao: "Dados básicos da obra atualizados pela empreiteira.", visivelParaCliente: false },
    });
    // Mantém a notificação interna atual para atualizações genéricas.
    await notificarEventoObra(tx, { obraId, empresaId, evento, visivelParaCliente: false, autorId: administradorId });
    // Retorna também o evento de vencimento quando o PATCH legado o recebeu.
    return { obra: atualizada, evento, ...(eventoVencimento ? { eventoVencimento } : {}) };
  };
  // Escolhe isolamento serializável para impedir corridas entre checagem e gravação.
  if (vencimentoInicialSolicitado !== undefined) return emTransacaoSerializavel(prisma, executar);
  // Mantém o isolamento atual para alterações que não mexem em vencimentos.
  return prisma.$transaction(executar);
}

// Exporta as funções usadas pelas rotas do servidor.
module.exports = {
  listarObras,
  buscarObraPorId,
  validarPermissaoAndamento,
  criarObra,
  listarAlocacoesDaObra,
  alocarFuncionario,
  encerrarAlocacao,
  moverAlocacao,
  confirmarPrimeiraParcela,
  registrarAndamento,
  reagendarObra,
  solicitarConferenciaObra,
  confirmarConclusaoObra,
  iniciarExecucaoObra,
  atualizarVencimentoObra,
  atualizarDadosObra,
  anexarFotoObra,
  salvarContratoObra,
  arquivarObra,
  restaurarObra,
  listarObrasArquivadas,
};
