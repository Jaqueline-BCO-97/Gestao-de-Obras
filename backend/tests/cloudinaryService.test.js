const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const cloudinary = require("../src/services/cloudinaryService");

const configuracaoOriginal = {
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};

function configurar() {
  process.env.CLOUDINARY_CLOUD_NAME = "teste-cloud";
  process.env.CLOUDINARY_API_KEY = "api-key-teste";
  process.env.CLOUDINARY_API_SECRET = "segredo-teste";
}

describe("upload seguro de fotos para Cloudinary", () => {
  it("assina e envia a imagem para a pasta da obra e retorna URL HTTPS", async () => {
    configurar();
    let requisicao;
    const url = await cloudinary.enviarFotoObra({
      obraId: "obra-123",
      foto: { data: `data:image/png;base64,${Buffer.from("png-teste").toString("base64")}`, mimeType: "image/png" },
      agora: 1700000000000,
      fetchImpl: async (destino, opcoes) => {
        requisicao = { destino, opcoes };
        return { ok: true, json: async () => ({ secure_url: "https://res.cloudinary.com/teste/image/upload/foto.png" }) };
      },
    });
    assert.equal(url, "https://res.cloudinary.com/teste/image/upload/foto.png");
    assert.match(requisicao.destino, /api\.cloudinary\.com\/v1_1\/teste-cloud\/image\/upload$/);
    assert.equal(requisicao.opcoes.method, "POST");
    assert.equal(requisicao.opcoes.body.get("api_key"), "api-key-teste");
    assert.equal(requisicao.opcoes.body.get("folder"), "gestao-de-obras/obra-123");
    assert.ok(requisicao.opcoes.body.get("signature"));
  });

  it("rejeita tipo inválido, conteúdo malformado e arquivos acima de 5 MB antes da rede", async () => {
    configurar();
    let chamadas = 0;
    const fetchImpl = async () => { chamadas += 1; throw new Error("não deve chamar"); };
    await assert.rejects(cloudinary.enviarFotoObra({ obraId: "x", foto: { data: "x", mimeType: "image/svg+xml" }, fetchImpl }), { code: "FOTO_INVALIDA" });
    const grande = Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64");
    await assert.rejects(cloudinary.enviarFotoObra({ obraId: "x", foto: { data: `data:image/png;base64,${grande}`, mimeType: "image/png" }, fetchImpl }), { code: "FOTO_INVALIDA" });
    assert.equal(chamadas, 0);
  });

  it("falha explicitamente quando as credenciais do Cloudinary não existem", async () => {
    delete process.env.CLOUDINARY_API_SECRET;
    await assert.rejects(cloudinary.enviarFotoObra({ obraId: "x", foto: {}, fetchImpl: async () => ({}) }), { code: "CLOUDINARY_NAO_CONFIGURADO" });
  });
});

process.on("exit", () => {
  for (const [chave, valor] of Object.entries(configuracaoOriginal)) {
    if (valor === undefined) delete process.env[chave];
    else process.env[chave] = valor;
  }
});
