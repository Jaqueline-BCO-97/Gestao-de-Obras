const { getPrisma, isDbConfigured } = require("../config/db");

function erroPagamento(code, message) {
  const erro = new Error(message);
  erro.code = code;
  return erro;
}

function exigirBancoConfigurado() {
  if (!isDbConfigured()) throw erroPagamento("DATABASE_NOT_CONFIGURED", "Banco não configurado");
}

function centavos(valor) {
  const texto = valor?.toString?.() ?? String(valor);
  const [inteiros, decimais = ""] = texto.split(".");
  return Number(inteiros) * 100 + Number(decimais.padEnd(2, "0").slice(0, 2));
}

function reais(quantiaCentavos) {
  return `${Math.floor(quantiaCentavos / 100)}.${String(quantiaCentavos % 100).padStart(2, "0")}`;
}

function somarPagamentosPorParcela(pagamentos) {
  const totais = new Map();
  for (const pagamento of pagamentos) {
    const atual = totais.get(pagamento.parcelaId) || { aprovado: 0, pendente: 0 };
    const campo = pagamento.status === "APROVADO" ? "aprovado" : "pendente";
    atual[campo] += centavos(pagamento.valor);
    totais.set(pagamento.parcelaId, atual);
  }
  return totais;
}

async function buscarPagamentoPorChave(chaveIdempotencia) {
  exigirBancoConfigurado();
  return getPrisma().pagamento.findFirst({
    where: { chaveIdempotencia, obra: { excluidaEm: null } },
    include: {
      obra: { select: { id: true, nome: true, status: true, conclusaoConfirmadaEm: true, quantidadeParcelas: true, excluidaEm: true } },
      parcela: { select: { id: true, numero: true, valor: true } },
      usuario: { select: { id: true, email: true } },
    },
  });
}

async function buscarTentativaPendenteDoCliente({ pagamentoId, obraId, empresaId, usuarioId }) {
  exigirBancoConfigurado();
  return getPrisma().pagamento.findFirst({
    // Restringe pagamento, obra, cliente e empresa autenticados; IDs alheios viram 404.
    where: { id: pagamentoId, obraId, usuarioId, obra: { empresaId, excluidaEm: null } },
    include: {
      obra: { select: { id: true, nome: true, status: true, conclusaoConfirmadaEm: true, quantidadeParcelas: true } },
      parcela: { select: { id: true, numero: true, valor: true } },
      usuario: { select: { id: true, email: true } },
    },
  });
}

async function criarTentativaPagamento({ obraId, empresaId, usuarioId, parcelaId, valorCentavos, chaveIdempotencia }) {
  exigirBancoConfigurado();
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const existente = await tx.pagamento.findUnique({
      where: { chaveIdempotencia },
      include: {
        obra: { select: { id: true, nome: true, status: true, conclusaoConfirmadaEm: true, quantidadeParcelas: true, excluidaEm: true } },
        parcela: { select: { id: true, numero: true, valor: true } },
        usuario: { select: { id: true, email: true } },
      },
    });
    if (existente) {
      if (existente.obra?.excluidaEm) throw erroPagamento("OBRA_NAO_ENCONTRADA", "Obra não encontrada para este cliente");
      return { pagamento: existente, repetida: true };
    }

    // O dono e a empresa são filtrados na própria consulta; dados do frontend
    // nunca podem ampliar o alcance do pagamento para outra conta ou empresa.
    const obra = await tx.obra.findFirst({
      where: { id: obraId, empresaId, clienteId: usuarioId, excluidaEm: null },
      select: {
        id: true,
        nome: true,
        valorTotal: true,
        status: true,
        conclusaoConfirmadaEm: true,
        quantidadeParcelas: true,
        parcelas: {
          select: { id: true, numero: true, valor: true, situacao: true },
          orderBy: { numero: "asc" },
        },
        cliente: { select: { id: true, email: true } },
      },
    });
    if (!obra) throw erroPagamento("OBRA_NAO_ENCONTRADA", "Obra não encontrada para este cliente");
    if (!obra.parcelas?.length) throw erroPagamento("PARCELAS_NAO_ENCONTRADAS", "A obra não possui parcelas cadastradas");

    const parcela = obra.parcelas.find((item) => item.id === parcelaId);
    if (!parcela) throw erroPagamento("PARCELA_NAO_ENCONTRADA", "Parcela não encontrada nesta obra");
    // A última parcela só pode ser iniciada após a confirmação da conclusão pelo cliente.
    if (obra.quantidadeParcelas > 1 && parcela.numero === obra.quantidadeParcelas && !obra.conclusaoConfirmadaEm) {
      throw erroPagamento("CONCLUSAO_NAO_CONFIRMADA", "A última parcela só pode ser paga após a confirmação da conclusão da obra");
    }

    const pagamentos = await tx.pagamento.findMany({
      where: { obraId, status: { in: ["PENDENTE", "APROVADO"] } },
      select: { parcelaId: true, valor: true, status: true },
    });
    const totais = somarPagamentosPorParcela(pagamentos);
    let saldoParcelas = 0;
    let pagosNaObra = 0;
    let reservadosNaObra = 0;
    const saldos = new Map();

    for (const item of obra.parcelas) {
      const total = totais.get(item.id) || { aprovado: 0, pendente: 0 };
      // Parcelas marcadas como pagas em dados legados continuam quitadas mesmo
      // que ainda não existam linhas no novo histórico de tentativas.
      const pago = item.situacao === "PAGA" ? centavos(item.valor) : Math.max(total.aprovado, 0);
      const saldo = Math.max(0, centavos(item.valor) - pago - total.pendente);
      saldos.set(item.id, saldo);
      saldoParcelas += Math.max(0, centavos(item.valor) - pago);
      pagosNaObra += pago;
      reservadosNaObra += total.pendente;
    }

    const saldoDaObra = Math.max(0, centavos(obra.valorTotal) - pagosNaObra - reservadosNaObra);
    const saldoPendente = Math.min(saldoParcelas - reservadosNaObra, saldoDaObra);
    if (valorCentavos > saldoPendente || valorCentavos > (saldos.get(parcelaId) || 0)) {
      throw erroPagamento("SALDO_INSUFICIENTE", "O valor excede o saldo pendente da obra ou da parcela");
    }

    const pagamentoCriado = await tx.pagamento.create({
      data: {
        obraId,
        parcelaId,
        usuarioId,
        valor: reais(valorCentavos),
        status: "PENDENTE",
        chaveIdempotencia,
      },
    });
    return {
      pagamento: pagamentoCriado,
      repetida: false,
      obra,
      parcela,
      usuario: obra.cliente,
    };
  }, { isolationLevel: "Serializable" });
}

async function salvarPedidoExterno(pagamentoId, pedidoExternoId, checkoutUrl) {
  exigirBancoConfigurado();
  return getPrisma().pagamento.update({
    where: { id: pagamentoId },
    data: { pedidoExternoId, checkoutUrl, detalheStatus: "created" },
  });
}

async function marcarTentativaComErro(pagamentoId, detalheStatus) {
  exigirBancoConfigurado();
  return getPrisma().pagamento.update({
    where: { id: pagamentoId },
    data: { status: "ERRO", detalheStatus: String(detalheStatus || "erro_provedor").slice(0, 120) },
  });
}

async function buscarPagamentoPorId(id) {
  exigirBancoConfigurado();
  return getPrisma().pagamento.findUnique({ where: { id } });
}

async function processarConfirmacaoExterna({ pagamentoId, pedidoExterno }) {
  exigirBancoConfigurado();
  const prisma = getPrisma();
  const referencia = pedidoExterno?.external_reference;
  if (referencia !== pagamentoId) throw erroPagamento("REFERENCIA_EXTERNA_INVALIDA", "Referência externa não corresponde à tentativa local");
  if (pedidoExterno?.currency_id !== "BRL") throw erroPagamento("MOEDA_INVALIDA", "A transação externa não está em reais");
  if (!pedidoExterno?.pedidoId || !Number.isFinite(Number(pedidoExterno.transaction_amount))) {
    throw erroPagamento("RESPOSTA_PROVEDOR_INVALIDA", "Dados do pedido externo incompletos");
  }

  return prisma.$transaction(async (tx) => {
    const pagamento = await tx.pagamento.findUnique({
      where: { id: pagamentoId },
      include: { obra: { select: { id: true, empresaId: true, status: true, conclusaoConfirmadaEm: true, quantidadeParcelas: true } }, parcela: { select: { id: true, numero: true, valor: true, situacao: true } } },
    });
    if (!pagamento) throw erroPagamento("PAGAMENTO_NAO_ENCONTRADO", "Tentativa de pagamento não encontrada");
    if (pagamento.pedidoExternoId !== String(pedidoExterno.pedidoId)) {
      throw erroPagamento("PEDIDO_EXTERNO_DIVERGENTE", "O pedido notificado não corresponde ao checkout criado");
    }
    if (centavos(pagamento.valor) !== centavos(pedidoExterno.transaction_amount)) {
      throw erroPagamento("VALOR_EXTERNO_DIVERGENTE", "O valor confirmado pelo provedor não corresponde à tentativa");
    }
    if (pedidoExterno.status === "approved" && !pedidoExterno.transacaoExternaId) {
      throw erroPagamento("RESPOSTA_PROVEDOR_INVALIDA", "Pedido aprovado sem identificador de transação");
    }
    if (pagamento.transacaoExternaId && pagamento.transacaoExternaId !== String(pedidoExterno.transacaoExternaId)) {
      throw erroPagamento("TRANSACAO_DUPLICADA", "A tentativa já está associada a outra transação externa");
    }

    const statusMapeado = {
      approved: "APROVADO",
      rejected: "RECUSADO",
      failed: "RECUSADO",
      cancelled: "CANCELADO",
      canceled: "CANCELADO",
    };
    const novoStatus = statusMapeado[pedidoExterno.status] || "PENDENTE";

    // Uma confirmação repetida é idempotente; estados terminais não retrocedem
    // por notificações atrasadas de estados anteriores.
    if (pagamento.status === "APROVADO") {
      if (pagamento.transacaoExternaId !== String(pedidoExterno.transacaoExternaId)) {
        throw erroPagamento("TRANSACAO_DUPLICADA", "Esta tentativa já foi confirmada com outra transação externa");
      }
      return pagamento;
    }
    if (["RECUSADO", "CANCELADO"].includes(pagamento.status) && novoStatus === "PENDENTE") return pagamento;

    const atualizado = await tx.pagamento.update({
      where: { id: pagamento.id },
      data: {
        status: novoStatus,
        ...(pedidoExterno.transacaoExternaId ? { transacaoExternaId: String(pedidoExterno.transacaoExternaId) } : {}),
        detalheStatus: String(pedidoExterno.status_detail || pedidoExterno.status || "pending").slice(0, 120),
      },
    });

    if (novoStatus === "APROVADO") {
      const pagamentosAprovados = await tx.pagamento.findMany({
        where: { parcelaId: pagamento.parcelaId, status: "APROVADO" },
        select: { valor: true },
      });
      const totalAprovado = pagamentosAprovados.reduce((total, item) => total + centavos(item.valor), 0);
      if (totalAprovado >= centavos(pagamento.parcela.valor)) {
        await tx.parcela.update({
          where: { id: pagamento.parcelaId },
          data: {
            situacao: "PAGA",
            pagaEm: new Date(),
            pagamentoExternoId: String(pedidoExterno.transacaoExternaId),
          },
        });
      }

      const parcelasDaObra = await tx.parcela.findMany({ where: { obraId: pagamento.obraId }, select: { situacao: true } });
      if (pagamento.obra.conclusaoConfirmadaEm && parcelasDaObra.length > 0 && parcelasDaObra.every((item) => item.situacao === "PAGA")) {
        await tx.obra.update({ where: { id: pagamento.obraId }, data: { status: "CONCLUIDA" } });
        await tx.obraEvento.create({
          data: {
            obraId: pagamento.obraId,
            empresaId: pagamento.obra.empresaId,
            usuarioId: pagamento.usuarioId,
            tipo: "STATUS",
            descricao: "Obra concluída após confirmação do cliente e quitação de todas as parcelas.",
            visivelParaCliente: true,
          },
        });
      }

      // O evento é criado somente na transição real para aprovado, nunca ao
      // gerar o checkout ou ao receber uma confirmação duplicada.
      const eventoPagamento = await tx.obraEvento.create({
        data: {
          obraId: pagamento.obraId,
          empresaId: pagamento.obra.empresaId,
          usuarioId: pagamento.usuarioId,
          tipo: "PAGAMENTO",
          descricao: `Pagamento de R$ ${reais(centavos(pagamento.valor))} da parcela ${pagamento.parcela.numero} confirmado.`,
          visivelParaCliente: true,
        },
      });
      const administradores = await tx.usuario.findMany({ where: { empresaId: pagamento.obra.empresaId, tipo: "ADMIN" }, select: { id: true } });
      const destinatarios = new Set([pagamento.usuarioId, ...administradores.map((administrador) => administrador.id)]);
      await tx.notificacao.createMany({ data: [...destinatarios].map((usuarioId) => ({
        empresaId: pagamento.obra.empresaId,
        usuarioId,
        obraId: pagamento.obraId,
        eventoId: eventoPagamento.id,
        tipo: "PAGAMENTO",
        titulo: "Pagamento confirmado",
        descricao: `Pagamento da parcela ${pagamento.parcela.numero} confirmado.`,
      })) });
    }

    return atualizado;
  }, { isolationLevel: "Serializable" });
}

module.exports = {
  criarTentativaPagamento,
  buscarPagamentoPorChave,
  buscarTentativaPendenteDoCliente,
  salvarPedidoExterno,
  marcarTentativaComErro,
  buscarPagamentoPorId,
  processarConfirmacaoExterna,
};
