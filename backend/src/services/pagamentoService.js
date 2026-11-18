const repository = require("../repositories/pagamentoRepository");
const mercadoPago = require("./mercadoPagoService");

function erroPagamento(code, message) {
  const erro = new Error(message);
  erro.code = code;
  return erro;
}

function valorEmCentavos(valor) {
  const texto = typeof valor === "number" ? valor.toFixed(2) : String(valor);
  const [inteiros, decimais = ""] = texto.split(".");
  return Number(inteiros) * 100 + Number(decimais.padEnd(2, "0").slice(0, 2));
}

function dinheiroEmCentavos(valor) {
  const texto = typeof valor === "number" ? valor.toFixed(2) : String(valor);
  const [inteiros, decimais = ""] = texto.split(".");
  if (!/^\d+$/.test(inteiros) || !/^\d*$/.test(decimais) || decimais.length > 2) return NaN;
  return Number(inteiros) * 100 + Number(decimais.padEnd(2, "0").slice(0, 2));
}

function compararTentativa(pagamento, { obraId, parcelaId, usuarioId, valorCentavos }) {
  return pagamento.obraId === obraId &&
    pagamento.parcelaId === parcelaId &&
    pagamento.usuarioId === usuarioId &&
    valorEmCentavos(pagamento.valor) === valorCentavos;
}

function validarAcessoSegundaParcela(pagamento) {
  if (pagamento.parcela?.numero === 2 && !pagamento.obra?.conclusaoConfirmadaEm) {
    throw erroPagamento("CONCLUSAO_NAO_CONFIRMADA", "A segunda parcela só pode ser paga após a confirmação da conclusão da obra");
  }
}

function respostaDaTentativa(pagamento, checkoutUrl = pagamento.checkoutUrl) {
  return {
    pagamento: {
      id: pagamento.id,
      obraId: pagamento.obraId,
      parcelaId: pagamento.parcelaId,
      valor: Number(pagamento.valor),
      status: pagamento.status,
      pedidoExternoId: pagamento.pedidoExternoId,
    },
    checkoutUrl: checkoutUrl || null,
  };
}

async function iniciarPagamento({ obraId, empresaId, usuarioId, parcelaId, valorCentavos, chaveIdempotencia }) {
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST) {
    throw erroPagamento("MERCADO_PAGO_NAO_CONFIGURADO", "Checkout sandbox não está configurado");
  }

  let pagamento = await repository.buscarPagamentoPorChave(chaveIdempotencia);
  let repetida = Boolean(pagamento);
  let contexto;

  if (pagamento) {
    if (!compararTentativa(pagamento, { obraId, parcelaId, usuarioId, valorCentavos })) {
      throw erroPagamento("CHAVE_IDEMPOTENCIA_REUTILIZADA", "A chave de idempotência já foi usada com outros dados");
    }
    validarAcessoSegundaParcela(pagamento);
    if (pagamento.status !== "PENDENTE") {
      return { ...respostaDaTentativa(pagamento), repetida: true };
    }
    if (pagamento.checkoutUrl && pagamento.pedidoExternoId) {
      return { ...respostaDaTentativa(pagamento), repetida: true };
    }
    contexto = {
      obra: pagamento.obra,
      parcela: pagamento.parcela,
      usuario: pagamento.usuario,
    };
  } else {
    try {
      const criacao = await repository.criarTentativaPagamento({
        obraId,
        empresaId,
        usuarioId,
        parcelaId,
        valorCentavos,
        chaveIdempotencia,
      });
      pagamento = criacao.pagamento;
      repetida = criacao.repetida;
      contexto = {
        obra: criacao.obra || pagamento.obra,
        parcela: criacao.parcela || pagamento.parcela,
        usuario: criacao.usuario || pagamento.usuario,
      };
      if (repetida && !compararTentativa(pagamento, { obraId, parcelaId, usuarioId, valorCentavos })) {
        throw erroPagamento("CHAVE_IDEMPOTENCIA_REUTILIZADA", "A chave de idempotência já foi usada com outros dados");
      }
      if (repetida && pagamento.checkoutUrl && pagamento.pedidoExternoId) {
        return { ...respostaDaTentativa(pagamento), repetida: true };
      }
    } catch (erro) {
      // Duas requisições com a mesma chave podem disputar o índice único. A
      // vencedora cria a tentativa; a outra recupera exatamente esse registro.
      if (erro.code !== "P2002" && erro.code !== "P2034") throw erro;
      pagamento = await repository.buscarPagamentoPorChave(chaveIdempotencia);
      if (!pagamento && erro.code === "P2034") throw erro;
      if (!pagamento || !compararTentativa(pagamento, { obraId, parcelaId, usuarioId, valorCentavos })) {
        throw erroPagamento("CHAVE_IDEMPOTENCIA_REUTILIZADA", "A chave de idempotência já foi usada com outros dados");
      }
      repetida = true;
      contexto = { obra: pagamento.obra, parcela: pagamento.parcela, usuario: pagamento.usuario };
      if (pagamento.checkoutUrl && pagamento.pedidoExternoId) {
        return { ...respostaDaTentativa(pagamento), repetida: true };
      }
    }
  }

  try {
    // O ID da tentativa é estável: o provedor usa-o como chave idempotente e
    // referência externa, protegendo também a repetição após timeout de rede.
    const pedido = await mercadoPago.criarPedidoSandbox({
      pagamento,
      obra: contexto.obra,
      parcela: contexto.parcela,
      email: contexto.usuario.email,
    });
    const salvo = await repository.salvarPedidoExterno(pagamento.id, pedido.id, pedido.checkoutUrl);
    return { ...respostaDaTentativa(salvo, pedido.checkoutUrl), repetida };
  } catch (erro) {
    // Uma rejeição HTTP definitiva libera a reserva. Timeout, resposta inválida
    // ou erro 5xx mantém PENDENTE: o provedor pode ter criado a order antes da falha.
    if (erro.code === "MERCADO_PAGO_REJEITOU" && erro.statusProvedor >= 400 && erro.statusProvedor < 500) {
      await repository.marcarTentativaComErro(pagamento.id, erro.code || "erro_provedor");
    }
    throw erro;
  }
}

async function retomarTentativaPagamento({ obraId, empresaId, usuarioId, pagamentoId }) {
  const pagamento = await repository.buscarTentativaPendenteDoCliente({ pagamentoId, obraId, empresaId, usuarioId });
  if (!pagamento) throw erroPagamento("TENTATIVA_NAO_ENCONTRADA", "Tentativa de pagamento não encontrada nesta obra");
  if (pagamento.status !== "PENDENTE") {
    throw erroPagamento("TENTATIVA_NAO_PENDENTE", "Somente tentativas pendentes podem ser retomadas");
  }
  validarAcessoSegundaParcela(pagamento);

  // A retomada usa o ID persistido como referência/idempotência do provedor e nunca cria nova reserva.
  if (pagamento.checkoutUrl && pagamento.pedidoExternoId) {
    return { ...respostaDaTentativa(pagamento), repetida: true };
  }

  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST) {
    throw erroPagamento("MERCADO_PAGO_NAO_CONFIGURADO", "Checkout sandbox não está configurado");
  }

  try {
    const pedido = await mercadoPago.criarPedidoSandbox({
      pagamento,
      obra: pagamento.obra,
      parcela: pagamento.parcela,
      email: pagamento.usuario.email,
    });
    const salvo = await repository.salvarPedidoExterno(pagamento.id, pedido.id, pedido.checkoutUrl);
    return { ...respostaDaTentativa(salvo, pedido.checkoutUrl), repetida: true };
  } catch (erro) {
    // Uma rejeição definitiva encerra a tentativa; falhas ambíguas preservam a reserva para nova retomada.
    if (erro.code === "MERCADO_PAGO_REJEITOU" && erro.statusProvedor >= 400 && erro.statusProvedor < 500) {
      await repository.marcarTentativaComErro(pagamento.id, erro.code);
    }
    throw erro;
  }
}

async function confirmarNotificacaoMercadoPago(dataId) {
  if (typeof dataId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(dataId)) {
    throw erroPagamento("NOTIFICACAO_INVALIDA", "Identificador de pedido inválido");
  }
  // A notificação informa o ID da Order. Consultamos essa Order na API oficial
  // antes de usar qualquer status, valor ou identificador recebido pelo webhook.
  const order = await mercadoPago.consultarPedidoExterno(dataId);
  const referencia = order?.external_reference;
  if (typeof referencia !== "string" || !referencia) return { ignorada: true };

  const pagamentosExternos = order?.transactions?.payments || [];
  const pagamentoProcessado = pagamentosExternos.find((item) => item.status === "processed");
  const pagamentoRecusado = pagamentosExternos.find((item) => ["failed", "rejected"].includes(item.status));
  let status = "pending";
  let transacaoExternaId = null;
  let statusDetail = order.status_detail || order.status;
  let valorConfirmado = order.total_amount;

  if (order.status === "processed" && pagamentoProcessado) {
    const totalPago = dinheiroEmCentavos(order.total_paid_amount);
    const valorTransacao = dinheiroEmCentavos(pagamentoProcessado.paid_amount ?? pagamentoProcessado.amount);
    // Uma order só aprova a parcela quando a quantia efetivamente capturada
    // coincide com o valor local; status de checkout isolado não basta.
    if (
      Number.isSafeInteger(totalPago) &&
      Number.isSafeInteger(valorTransacao) &&
      totalPago === valorTransacao &&
      String(pagamentoProcessado.id || "")
    ) {
      status = "approved";
      transacaoExternaId = String(pagamentoProcessado.id);
      valorConfirmado = pagamentoProcessado.paid_amount ?? pagamentoProcessado.amount;
      statusDetail = pagamentoProcessado.status_detail || order.status;
    }
  } else if (order.status === "failed" || order.status === "canceled" || order.status === "cancelled") {
    status = order.status;
  } else if (pagamentoRecusado) {
    status = "rejected";
    statusDetail = pagamentoRecusado.status_detail || pagamentoRecusado.status;
  }

  const pedidoExterno = {
    pedidoId: String(order.id || dataId),
    external_reference: referencia,
    // A resposta de consulta da Orders API chama o campo `currency`, enquanto
    // alguns payloads de notificação usam `currency_id`.
    currency_id: order.currency_id || order.currency,
    transaction_amount: valorConfirmado,
    transacaoExternaId,
    status,
    status_detail: statusDetail,
  };

  try {
    const atualizado = await repository.processarConfirmacaoExterna({
      pagamentoId: referencia,
      pedidoExterno,
    });
    return { ignorada: false, status: atualizado.status };
  } catch (erro) {
    // Webhooks de outros produtos da mesma conta são reconhecidos, mas não
    // podem alterar parcelas deste sistema se a referência local não existir.
    if (erro.code === "PAGAMENTO_NAO_ENCONTRADO") return { ignorada: true };
    throw erro;
  }
}

module.exports = { iniciarPagamento, retomarTentativaPagamento, confirmarNotificacaoMercadoPago };
