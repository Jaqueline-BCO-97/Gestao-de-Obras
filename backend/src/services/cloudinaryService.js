const crypto = require("node:crypto");

const TIPOS_DE_IMAGEM = new Set(["image/jpeg", "image/png", "image/webp"]);
const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const TAMANHO_MAXIMO_CONTRATO = 10 * 1024 * 1024;

function erroUpload(code, message) {
  const erro = new Error(message);
  erro.code = code;
  return erro;
}

function configurarCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw erroUpload("CLOUDINARY_NAO_CONFIGURADO", "Upload indisponível: configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no ambiente do backend.");
  }
  return { cloudName, apiKey, apiSecret };
}

async function enviarFotoObra({ foto, obraId, fetchImpl = global.fetch, agora = Date.now() }) {
  const { cloudName, apiKey, apiSecret } = configurarCloudinary();
  if (!foto || typeof foto !== "object" || typeof foto.data !== "string" || !TIPOS_DE_IMAGEM.has(foto.mimeType)) {
    throw erroUpload("FOTO_INVALIDA", "Envie uma foto JPG, PNG ou WebP válida");
  }

  const partes = foto.data.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!partes || partes[1] !== foto.mimeType) {
    throw erroUpload("FOTO_INVALIDA", "O conteúdo da foto não corresponde ao formato informado");
  }
  const bytes = Buffer.from(partes[2], "base64");
  if (!bytes.length || bytes.length > TAMANHO_MAXIMO || bytes.toString("base64").replace(/=+$/, "") !== partes[2].replace(/=+$/, "")) {
    throw erroUpload("FOTO_INVALIDA", "A foto deve ter até 5 MB e estar codificada corretamente");
  }
  if (typeof fetchImpl !== "function") throw erroUpload("CLOUDINARY_INDISPONIVEL", "Cliente HTTP não disponível");

  const timestamp = Math.floor(agora / 1000);
  const folder = `gestao-de-obras/${obraId}`;
  const publicId = crypto.randomUUID();
  const assinatura = crypto.createHash("sha1")
    .update(`folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");
  const formulario = new FormData();
  formulario.set("file", new Blob([bytes], { type: foto.mimeType }), `${publicId}.${foto.mimeType.split("/")[1]}`);
  formulario.set("api_key", apiKey);
  formulario.set("timestamp", String(timestamp));
  formulario.set("folder", folder);
  formulario.set("public_id", publicId);
  formulario.set("signature", assinatura);

  let resposta;
  try {
    resposta = await fetchImpl(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
      method: "POST",
      body: formulario,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw erroUpload("CLOUDINARY_INDISPONIVEL", "Não foi possível enviar a foto ao armazenamento");
  }
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw erroUpload("CLOUDINARY_FALHA", "O armazenamento recusou o upload da foto");
  let url;
  try { url = new URL(dados?.secure_url); } catch { /* validação abaixo */ }
  if (!url || url.protocol !== "https:" || !url.hostname.endsWith(".cloudinary.com")) {
    throw erroUpload("CLOUDINARY_RESPOSTA_INVALIDA", "O armazenamento retornou uma URL de foto inválida");
  }
  return url.toString();
}

async function enviarContratoObra({ arquivo, obraId, fetchImpl = global.fetch, agora = Date.now() }) {
  const { cloudName, apiKey, apiSecret } = configurarCloudinary();
  if (!arquivo || typeof arquivo.data !== "string" || arquivo.mimeType !== "application/pdf") throw erroUpload("CONTRATO_INVALIDO", "Envie um contrato PDF válido");
  const partes = arquivo.data.match(/^data:application\/pdf;base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!partes) throw erroUpload("CONTRATO_INVALIDO", "O conteúdo do contrato não corresponde ao formato PDF");
  const bytes = Buffer.from(partes[1], "base64");
  if (!bytes.length || bytes.length > TAMANHO_MAXIMO_CONTRATO || bytes.toString("base64").replace(/=+$/, "") !== partes[1].replace(/=+$/, "")) throw erroUpload("CONTRATO_INVALIDO", "O contrato deve ter até 10 MB e estar codificado corretamente");
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw erroUpload("CONTRATO_INVALIDO", "O arquivo selecionado não contém um PDF válido");
  if (typeof fetchImpl !== "function") throw erroUpload("CLOUDINARY_INDISPONIVEL", "Cliente HTTP não disponível");

  const timestamp = Math.floor(agora / 1000);
  const folder = `gestao-de-obras/${obraId}/contratos`;
  const publicId = `${crypto.randomUUID()}.pdf`;
  const assinatura = crypto.createHash("sha1").update(`folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  const formulario = new FormData();
  formulario.set("file", new Blob([bytes], { type: "application/pdf" }), publicId);
  formulario.set("api_key", apiKey);
  formulario.set("timestamp", String(timestamp));
  formulario.set("folder", folder);
  formulario.set("public_id", publicId);
  formulario.set("signature", assinatura);
  let resposta;
  try {
    resposta = await fetchImpl(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/raw/upload`, { method: "POST", body: formulario, signal: AbortSignal.timeout(15000) });
  } catch { throw erroUpload("CLOUDINARY_INDISPONIVEL", "Não foi possível enviar o contrato ao armazenamento"); }
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw erroUpload("CLOUDINARY_FALHA", "O armazenamento recusou o contrato PDF");
  let url;
  try { url = new URL(dados?.secure_url); } catch { /* valida abaixo */ }
  if (!url || url.protocol !== "https:" || !url.hostname.endsWith(".cloudinary.com")) throw erroUpload("CLOUDINARY_RESPOSTA_INVALIDA", "O armazenamento retornou uma URL de contrato inválida");
  return url.toString();
}

module.exports = { enviarFotoObra, enviarContratoObra, TAMANHO_MAXIMO, TAMANHO_MAXIMO_CONTRATO };
