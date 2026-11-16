const crypto = require("node:crypto");

const API_BASE = "https://api.mercadopago.com";

function erroMercadoPago(codigo, mensagem, status) {
  const erro = new Error(mensagem);
  erro.code = codigo;
  if (status) erro.statusProvedor = status;
  return erro;
}

function obterTokenSandbox() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST;
  if (!token) {
    throw erroMercadoPago("MERCADO_PAGO_NAO_CONFIGURADO", "Credenciais de sandbox do Mercado Pago não configuradas");
  }
  return token;
}

async function requisitarMercadoPago(caminho, { method = "GET", body, idempotencyKey, fetchImpl = global.fetch } = {}) {
  const token = obterTokenSandbox();
  if (typeof fetchImpl !== "function") {
    throw erroMercadoPago("MERCADO_PAGO_INDISPONIVEL", "O runtime não oferece cliente HTTP compatível");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;

    const resposta = await fetchImpl(`${API_BASE}${caminho}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    const dados = await resposta.json().catch(() => null);
    if (!resposta.ok) {
      throw erroMercadoPago("MERCADO_PAGO_REJEITOU", "O Mercado Pago não aceitou a solicitação", resposta.status);
    }
    return dados;
  } catch (erro) {
    if (erro.code) throw erro;
    throw erroMercadoPago("MERCADO_PAGO_INDISPONIVEL", "Não foi possível comunicar com o Mercado Pago");
  } finally {
    clearTimeout(timeout);
  }
}

// Usa Orders API do Checkout Pro: o ID local funciona como referência externa
// e como chave estável para repetir a criação sem duplicar a order no provedor.
async function criarPedidoSandbox({ pagamento, obra, parcela, email }) {
  const valor = Number(pagamento.valor).toFixed(2);
  const pedido = await requisitarMercadoPago("/v1/orders", {
    method: "POST",
    idempotencyKey: pagamento.id,
    body: {
      type: "online",
      processing_mode: "manual",
      total_amount: valor,
      external_reference: pagamento.id,
      description: `Pagamento da parcela ${parcela.numero} da obra ${obra.nome}`.slice(0, 250),
      payer: { email },
      items: [{ title: `Parcela ${parcela.numero} - ${obra.nome}`.slice(0, 250), quantity: 1, unit_price: valor }],
    },
  });

  if (typeof pedido?.id !== "string" || typeof pedido?.checkout_url !== "string") {
    throw erroMercadoPago("MERCADO_PAGO_RESPOSTA_INVALIDA", "O Mercado Pago retornou uma resposta incompleta");
  }
  let urlCheckout;
  try {
    urlCheckout = new URL(pedido.checkout_url);
  } catch {
    throw erroMercadoPago("MERCADO_PAGO_RESPOSTA_INVALIDA", "O Mercado Pago retornou uma URL de checkout inválida");
  }
  if (urlCheckout.protocol !== "https:" || !(urlCheckout.hostname === "mercadopago.com.br" || urlCheckout.hostname.endsWith(".mercadopago.com.br"))) {
    throw erroMercadoPago("MERCADO_PAGO_RESPOSTA_INVALIDA", "O Mercado Pago retornou uma origem de checkout inválida");
  }
  return { id: pedido.id, checkoutUrl: urlCheckout.toString() };
}

async function consultarPedidoExterno(id) {
  return requisitarMercadoPago(`/v1/orders/${encodeURIComponent(id)}`);
}

function validarAssinaturaWebhook({ assinatura, requestId, dataId, segredo }) {
  if (!segredo || !assinatura || !requestId || !dataId) return false;

  const campos = Object.fromEntries(assinatura.split(",").map((parte) => {
    const separador = parte.indexOf("=");
    return separador < 0 ? ["", ""] : [parte.slice(0, separador).trim(), parte.slice(separador + 1).trim()];
  }));
  const timestamp = campos.ts;
  const assinaturaRecebida = campos.v1;
  if (!timestamp || !/^[a-f0-9]{64}$/i.test(assinaturaRecebida || "")) return false;

  // O Mercado Pago assina o identificador notificado, o request-id e o timestamp.
  const manifesto = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${timestamp};`;
  const assinaturaEsperada = crypto.createHmac("sha256", segredo).update(manifesto).digest();
  const assinaturaInformada = Buffer.from(assinaturaRecebida, "hex");
  return assinaturaInformada.length === assinaturaEsperada.length &&
    crypto.timingSafeEqual(assinaturaEsperada, assinaturaInformada);
}

module.exports = {
  criarPedidoSandbox,
  consultarPedidoExterno,
  validarAssinaturaWebhook,
  requisitarMercadoPago,
};
