// Importa o cliente do banco e a verificação de configuração.
const { getPrisma, isDbConfigured } = require("../config/db");

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

async function notificarEventoObra(tx, { obraId, empresaId, evento, visivelParaCliente = true, autorId = null, incluirGerentes = true }) {
  const [obra, administradores, escalasAtivas] = await Promise.all([
    tx.obra.findFirst({ where: { id: obraId, empresaId }, select: { clienteId: true } }),
    tx.usuario.findMany({ where: { empresaId, tipo: "ADMIN", ...(autorId ? { id: { not: autorId } } : {}) }, select: { id: true } }),
    incluirGerentes && tx.obraEscala?.findMany
      ? tx.obraEscala.findMany({ where: { obraId, dataFim: null, funcionario: { ativo: true } }, select: { funcionario: { select: { usuarioId: true } } } })
      : [],
  ]);
  const destinatarios = [
    ...administradores.map(({ id }) => id),
    ...escalasAtivas.map(({ funcionario }) => funcionario?.usuarioId).filter(Boolean),
    ...(visivelParaCliente && obra?.clienteId && obra.clienteId !== autorId ? [obra.clienteId] : []),
  ].filter((usuarioId) => usuarioId !== autorId);
  if (!destinatarios.length) return;
  await tx.notificacao.createMany({ data: destinatarios.map((usuarioId) => ({
    empresaId, usuarioId, obraId, eventoId: evento.id, tipo: evento.tipo,
    titulo: evento.tipo === "AGENDAMENTO" ? "Alteração no calendário da obra" : "Atualização da obra",
    descricao: evento.descricao,
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
  const prisma = getPrisma();
  const obra = await prisma.obra.findFirst({
    where: { id: obraId, empresaId },
    select: { id: true },
  });
  if (!obra) return null;

  const alocacoes = await prisma.obraEscala.findMany({
    where: { obraId, obra: { empresaId }, funcionario: { empresaId } },
    include: {
      funcionario: {
        select: {
          id: true,
          nome: true,
          funcao: true,
          nivel: true,
          usuarioId: true,
        },
      },
      alteradoPor: { select: { id: true, nome: true } },
    },
    orderBy: [{ dataInicio: "desc" }, { id: "desc" }],
  });

  return {
    alocacoesAbertas: alocacoes.filter((alocacao) => alocacao.dataFim === null),
    historico: alocacoes.filter((alocacao) => alocacao.dataFim !== null),
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

    const duplicada = await tx.obraEscala.findFirst({
      where: { obraId, funcionarioId, dataFim: null },
      select: { id: true },
    });
    if (duplicada) throw erroAlocacao("ALOCACAO_DUPLICADA", "Funcionário já possui alocação aberta nesta obra");

    const alocacao = await tx.obraEscala.create({
      data: {
        obraId,
        funcionarioId,
        dataInicio: new Date(),
        alteradoPorId: administradorId,
      },
      include: {
        funcionario: { select: { id: true, nome: true, funcao: true, nivel: true } },
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

function formatarDataHoraAgendamento(data) {
  return `${new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(data)} UTC`;
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

  // O lock transacional por empresa faz a checagem de conflitos e a gravação
  // formarem uma seção crítica entre diferentes requisições do mesmo tenant.
  // O isolamento serializável fornece proteção adicional contra escritas externas.
  for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        // O hash é apenas a chave do advisory lock; colisões só serializam
        // empresas distintas e não misturam dados nem permissões.
        await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtextextended(${empresaId}, 0))) AS lock_empresa`;

        const obraAtual = await tx.obra.findFirst({
          where: { id: obraId, empresaId },
          select: { id: true, agendadaPara: true, prazoFinal: true },
        });
        if (!obraAtual) return null;

        const conflito = await tx.obra.findFirst({
          where: {
            empresaId,
            id: { not: obraId },
            // Obras sem os dois limites não reservam um intervalo comparável.
            agendadaPara: { not: null, lt: prazoFinal },
            prazoFinal: { not: null, gt: agendadaPara },
            // StatusObra não possui estado CANCELADA; CONCLUIDA é o único
            // estado terminal existente e não bloqueia novos agendamentos.
            status: { not: "CONCLUIDA" },
          },
          select: { id: true, nome: true },
        });
        if (conflito) {
          throw erroAgendamento("AGENDAMENTO_CONFLITO", "Conflito de agendamento: o intervalo se sobrepõe ao de outra obra desta empresa");
        }

        // Uma repetição idêntica ainda passa pela checagem de conflito, mas não
        // constitui nova confirmação e não duplica o evento da timeline.
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

        await tx.obra.update({
          where: { id: obraId },
          data: { agendadaPara, prazoFinal },
        });

        const evento = await tx.obraEvento.create({
          data: {
            obraId,
            empresaId,
            usuarioId: administradorId,
            tipo: "AGENDAMENTO",
            descricao: `Obra reagendada para ${formatarDataHoraAgendamento(agendadaPara)} até ${formatarDataHoraAgendamento(prazoFinal)}.`,
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
      // A nova transação adquire outro snapshot depois de liberar o lock; assim
      // uma disputa simultânea vira conflito de domínio quando os horários se cruzam.
    }
  }
}

// Define os relacionamentos necessários para formar a resposta do frontend.
function incluirDadosDaObra(empresaId) {
  return {
    // Busca os dados do cliente relacionado à obra.
    cliente: { select: { id: true, nome: true, empresaId: true } },
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

// Listas dos painéis precisam apenas do resumo; o detalhe carrega o histórico completo.
function incluirDadosDaLista(empresaId, tipo) {
  const include = {
    cliente: { select: { id: true, nome: true, empresaId: true } },
    parcelas: {
      where: { numero: { lte: 2 } },
      orderBy: { numero: "asc" },
      take: 2,
      include: { pagamentos: { where: { status: { in: ["APROVADO", "PENDENTE"] } }, select: { id: true, valor: true, status: true } } },
    },
    eventos: {
      where: { empresaId, usuario: { empresaId } },
      include: { usuario: { select: { nome: true } } },
      orderBy: { criadoEm: "desc" },
      take: 10,
    },
    escalas: {
      where: { dataFim: null, funcionario: { empresaId } },
      include: { funcionario: { select: { id: true, nome: true, funcao: true, telefone: true } } },
      orderBy: [{ dataInicio: "asc" }, { id: "asc" }],
    },
  };
  if (tipo === "ADMIN") {
    include.convites = {
      where: { tipo: "CLIENTE", usadoEm: null, expiraEm: { gt: new Date() } },
      select: { id: true },
    };
  }
  if (tipo === "CLIENTE") include.contrato = { select: { id: true, termos: true, arquivoUrl: true, criadoEm: true } };
  return include;
}

// Converte datas do banco para o formato dia/mês/ano usado no mock.
function formatarData(data) {
  // Mantém valores ausentes como nulos.
  if (!data) return null;
  // Formata a data com os componentes UTC para evitar variação por fuso horário.
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(data);
}

// Converte o estado interno da obra para o texto legível do frontend.
function formatarStatus(status) {
  // Relaciona os códigos do banco aos rótulos apresentados ao usuário.
  const rotulos = { AGENDADA: "Agendada", EM_ANDAMENTO: "Em andamento", AGUARDANDO_CONFERENCIA: "Aguardando conferência", CONCLUIDA: "Concluída" };
  // Usa o próprio valor como alternativa para estados ainda desconhecidos.
  return rotulos[status] || status;
}

// Converte uma parcela do banco para o mesmo formato do mock.
function formatarParcela(parcela) {
  // Retorna nulo quando a obra não possui esta parcela.
  if (!parcela) return null;
  // Prepara a parcela com número, valor numérico e situação legível.
  const valor = Number(parcela.valor);
  const pagamentos = parcela.pagamentos || [];
  const aprovado = pagamentos.filter((pagamento) => pagamento.status === "APROVADO").reduce((total, pagamento) => total + Number(pagamento.valor), 0);
  const reservado = pagamentos.filter((pagamento) => pagamento.status === "PENDENTE").reduce((total, pagamento) => total + Number(pagamento.valor), 0);
  // Saldo devedor considera apenas aprovações; reservas são informadas separadamente.
  const saldoDevedor = parcela.situacao === "PAGA" ? 0 : Math.max(0, valor - aprovado);
  const saldoDisponivel = Math.max(0, saldoDevedor - reservado);
  const emAtraso = parcela.situacao !== "PAGA" && parcela.vencimento && new Date(parcela.vencimento) < new Date();
  const resposta = { id: parcela.id, numero: parcela.numero, valor, situacao: parcela.situacao === "PAGA" ? "paga" : emAtraso ? "atrasada" : "pendente", valorPago: parcela.situacao === "PAGA" ? valor : aprovado, valorReservado: reservado, saldoDevedor, saldoDisponivel, vencimento: formatarData(parcela.vencimento), comprovanteUrl: parcela.comprovanteUrl, tentativasPendentes: pagamentos.filter((pagamento) => pagamento.status === "PENDENTE").map((pagamento) => ({ id: pagamento.id, valor: Number(pagamento.valor) })) };
  // Inclui a data do pagamento quando a parcela foi quitada.
  if (parcela.pagaEm) resposta.pagamento = formatarData(parcela.pagaEm);
  // Informa vencimento nulo porque o banco não possui esse campo no schema atual.
  if (parcela.comprovanteEnviadoEm) resposta.comprovanteEnviadoEm = formatarData(parcela.comprovanteEnviadoEm);
  // Devolve a parcela no formato usado pelo mock.
  return resposta;
}

// Oculta valores em reais nas descrições enviadas a colaboradores.
function ocultarValoresFinanceiros(descricao) {
  return descricao.replace(/R\$\s?\d[\d.,]*/gi, "[valor oculto]");
}

// Converte uma obra com relações para os nomes de campo usados no mock.
function formatarTimeline(eventos, tipo) {
  return eventos
    .filter((evento) => tipo === "CLIENTE" ? evento.visivelParaCliente : tipo === "COLABORADOR" ? !["PAGAMENTO", "ORCAMENTO_APROVADO", "CONTRATACAO"].includes(evento.tipo) : true)
    .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm))
    .map((evento) => ({
      id: evento.id,
      data: formatarData(evento.criadoEm),
      hora: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(evento.criadoEm),
      autor: evento.usuario.nome,
      tipo: evento.tipo.toLowerCase(),
      descricao: tipo === "COLABORADOR" ? ocultarValoresFinanceiros(evento.descricao) : evento.descricao,
      fotoUrl: evento.fotoUrl,
      visivelParaCliente: evento.visivelParaCliente,
    }));
}

function formatarObra(obra, tipo) {
  // Ordena as parcelas já consultadas pelo número sequencial.
  const parcelas = [...(obra.parcelas || [])].sort((a, b) => a.numero - b.numero);
  // Prepara os campos gerais da resposta da obra.
  const resposta = {
    // Preserva o identificador da obra no banco.
    id: obra.id,
    // Renomeia o nome armazenado para o título do mock.
    titulo: obra.nome,
    clienteId: obra.clienteId,
    descricao: obra.descricao,
    // Inclui o nome do cliente ou nulo se não houver associação.
    cliente: obra.cliente?.empresaId === obra.empresaId ? obra.cliente.nome : null,
    // Apresenta os nomes dos funcionários atualmente escalados.
    colaboradores: (obra.escalas || []).map((escala) => ({ id: escala.funcionario.id, nome: escala.funcionario.nome, funcao: escala.funcionario.funcao, ...(tipo === "ADMIN" ? { telefone: escala.funcionario.telefone } : {}) })),
    funcionariosProgramados: [...new Map((obra.disponibilidades || []).map((item) => [item.funcionario.id, { id: item.funcionario.id, nome: item.funcionario.nome, funcao: item.funcionario.funcao, telefone: tipo === "ADMIN" ? item.funcionario.telefone : undefined, fotoUrl: item.funcionario.fotoUrl, diasSemana: obra.disponibilidades.filter((dia) => dia.funcionarioId === item.funcionarioId).map((dia) => dia.diaSemana) }])).values()],
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
    prazo: formatarData(obra.prazoFinal),
    prazoISO: obra.prazoFinal ? new Date(obra.prazoFinal).toISOString().slice(0, 10) : "",
    agendadaPara: obra.agendadaPara ? new Date(obra.agendadaPara).toISOString() : null,
    agendadaParaISO: obra.agendadaPara ? new Date(obra.agendadaPara).toISOString().slice(0, 10) : "",
    conclusaoConfirmadaEm: obra.conclusaoConfirmadaEm ? new Date(obra.conclusaoConfirmadaEm).toISOString() : null,
    // Adapta os eventos ao formato da linha do tempo do mock.
    timeline: formatarTimeline(obra.eventos || [], tipo),
  };
  if (tipo !== "CLIENTE") resposta.informacoesAdicionais = obra.informacoesAdicionais;
  if (tipo === "ADMIN") resposta.conviteClientePendente = Boolean(obra.convites?.length);
  if (tipo !== "COLABORADOR") resposta.contrato = obra.contrato;
  // Inclui dados financeiros apenas para clientes e administradores.
  if (tipo !== "COLABORADOR") {
    // Converte o valor Decimal para número compatível com JSON.
    resposta.valorTotal = Number(obra.valorTotal);
    resposta.quantidadeParcelas = obra.quantidadeParcelas || parcelas.length;
    resposta.taxaJurosMensal = Number(obra.taxaJurosMensal || 0);
    resposta.valorBase = Number(obra.valorBase || obra.valorTotal);
    resposta.parcelas = parcelas.map(formatarParcela);
    resposta.resumoFinanceiro = `Contrato fechado com divisão em (${obra.quantidadeParcelas || parcelas.length}) etapas`;
    // Converte a primeira parcela para o campo usado pelo mock.
    resposta.parcela1 = formatarParcela(parcelas[0]);
    // Converte a segunda parcela para o campo usado pelo mock.
    resposta.parcela2 = formatarParcela(parcelas[1]);
  }
  // Devolve o objeto final da obra.
  return resposta;
}

// Busca as obras da empresa e aplica o filtro específico do perfil.
async function listarObras(empresaId, usuarioId, tipo) {
  // Confirma que o banco pode receber consultas.
  exigirBancoConfigurado();
  // Começa restringindo os resultados à empresa do token.
  const where = { empresaId, excluidaEm: null };
  // Limita clientes às obras ligadas ao próprio usuário.
  if (tipo === "CLIENTE") where.clienteId = usuarioId;
  // Limita colaboradores às obras com escala aberta para seu funcionário.
  if (tipo === "COLABORADOR") where.escalas = { some: { dataFim: null, funcionario: { usuarioId, empresaId } } };
  // Consulta as obras e suas relações para montar a resposta completa.
  const obras = await getPrisma().obra.findMany({ where, include: incluirDadosDaLista(empresaId, tipo), orderBy: { criadoEm: "desc" } });
  // Devolve cada obra no formato do frontend e com a timeline filtrada.
  if (tipo === "COLABORADOR") {
    obras.sort((a, b) => new Date(a.escalas?.[0]?.dataInicio || 0) - new Date(b.escalas?.[0]?.dataInicio || 0) || a.id.localeCompare(b.id));
    return obras.map((obra, indice) => ({ ...formatarObra(obra, tipo), numeroObra: indice + 1 }));
  }
  return obras.map((obra) => formatarObra(obra, tipo));
}

// Busca uma obra somente dentro da empresa do token.
async function buscarObraPorId(id, empresaId, usuarioId, tipo) {
  // Confirma que o banco pode receber consultas.
  exigirBancoConfigurado();
  // Começa o filtro pelo identificador da obra e da empresa.
  const where = { id, empresaId, excluidaEm: null };
  // Exige que a obra pertença ao cliente autenticado.
  if (tipo === "CLIENTE") where.clienteId = usuarioId;
  // Exige uma escala aberta do funcionário ligado ao colaborador autenticado.
  if (tipo === "COLABORADOR") where.escalas = { some: { dataFim: null, funcionario: { usuarioId, empresaId } } };
  // A busca única já retorna nulo para obras fora do filtro.
  const obra = await getPrisma().obra.findFirst({ where, include: incluirDadosDaObra(empresaId) });
  // Converte a obra encontrada ou preserva o nulo para a rota responder 404.
  return obra ? formatarObra(obra, tipo) : null;
}

// Cria uma obra com os dados aceitos atualmente pela rota POST.
async function criarObra({ empresaId, administradorId, nome, descricao, endereco, estado, cidade, bairro, numero, apartamento, bloco, semApartamento, semBloco, informacoesAdicionais, valorTotal, prazoFinal, clienteId = null, quantidadeParcelas = 2, vencimentoInicial = null, fotos = [] }) {
  // Confirma que o banco pode receber gravações.
  exigirBancoConfigurado();
  const quantidade = Math.min(36, Math.max(1, Number(quantidadeParcelas) || 2));
  const valor = Number(valorTotal);
  const hoje = new Date();
  const primeiraData = vencimentoInicial ? new Date(`${vencimentoInicial}T12:00:00.000Z`) : new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 10, 12));
  const valoresParcelas = Array.from({ length: quantidade }, () => Math.round((valor / quantidade) * 100) / 100);
  valoresParcelas[valoresParcelas.length - 1] = Math.round((valor - valoresParcelas.slice(0, -1).reduce((soma, n) => soma + n, 0)) * 100) / 100;
  return getPrisma().$transaction(async (tx) => {
    const obra = await tx.obra.create({ data: {
      empresaId, nome, descricao, endereco, estado, cidade, bairro, numero, apartamento, bloco,
      semApartamento: Boolean(semApartamento), semBloco: Boolean(semBloco), informacoesAdicionais,
      valorTotal, valorBase: valorTotal, quantidadeParcelas: quantidade, taxaJurosMensal: quantidade > 12 ? 1 : 0, prazoFinal, clienteId, fotos,
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
  const obras = await getPrisma().obra.findMany({ where: { empresaId, excluidaEm: { not: null } }, include: incluirDadosDaObra(empresaId), orderBy: { excluidaEm: "desc" } });
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

async function atualizarDadosObra({ obraId, empresaId, administradorId, dados }) {
  exigirBancoConfigurado();
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const obra = await tx.obra.findFirst({ where: { id: obraId, empresaId, excluidaEm: null }, select: { id: true, quantidadeParcelas: true, taxaJurosMensal: true } });
    if (!obra) return null;
    if (dados.valorTotal !== undefined) {
      const parcelas = await tx.parcela.findMany({ where: { obraId }, include: { pagamentos: { select: { id: true } } }, orderBy: { numero: "asc" } });
      if (parcelas.some((parcela) => parcela.situacao === "PAGA" || parcela.pagamentos.length > 0)) {
        const erro = new Error("O valor da obra não pode mudar depois de um pagamento confirmado");
        erro.code = "VALOR_OBRA_TRAVADO";
        throw erro;
      }
      const quantidade = parcelas.length || obra.quantidadeParcelas || 2;
      const valorBase = Number(dados.valorTotal);
      const taxa = Number(obra.taxaJurosMensal || 0);
      const valorFinal = Math.round(valorBase * (1 + (taxa / 100) * Math.max(0, quantidade - 12)) * 100) / 100;
      const valores = Array.from({ length: quantidade }, () => Math.round((valorFinal / quantidade) * 100) / 100);
      valores[valores.length - 1] = Math.round((valorFinal - valores.slice(0, -1).reduce((soma, item) => soma + item, 0)) * 100) / 100;
      for (const parcela of parcelas) await tx.parcela.update({ where: { id: parcela.id }, data: { valor: valores[parcela.numero - 1].toFixed(2) } });
      dados.valorBase = valorBase.toFixed(2);
      dados.valorTotal = valorFinal.toFixed(2);
    }
    const atualizada = await tx.obra.update({ where: { id: obraId }, data: dados });
    const evento = await tx.obraEvento.create({
      data: { obraId, empresaId, usuarioId: administradorId, tipo: "ANOTACAO", descricao: "Dados básicos da obra atualizados pela empreiteira.", visivelParaCliente: false },
    });
    await notificarEventoObra(tx, { obraId, empresaId, evento, visivelParaCliente: false, autorId: administradorId });
    return { obra: atualizada, evento };
  });
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
  atualizarDadosObra,
  anexarFotoObra,
  salvarContratoObra,
  arquivarObra,
  restaurarObra,
  listarObrasArquivadas,
};
