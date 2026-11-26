// Importa o runner de testes nativo do Node e as asserções estritas.
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
// Guarda os dados simulados para confirmar que a API não usa banco compartilhado.
const registrosEmpresa = [];
const atualizacoesEmpresa = [];
// Configura uma chave exclusiva de teste sem ler segredos do ambiente do projeto.
process.env.JWT_SECRET = "segredo-local-de-teste-empresa";

// Prepara as operações Prisma simuladas utilizadas no cadastro público.
const transacaoFalsa = {
  empresa: {
    create: async ({ data }) => {
      registrosEmpresa.push(data);
      return { id: `empresa-teste-${registrosEmpresa.length}` };
    },
  },
  usuario: {
    create: async ({ data }) => ({ ...data, id: `admin-teste-${registrosEmpresa.length}` }),
  },
};

// Simula somente as gravações usadas pelos endpoints cobertos neste arquivo.
const prismaFalso = {
  $transaction: async (executar) => executar(transacaoFalsa),
  usuario: {
    update: async ({ where, data }) => ({
      id: where.id,
      empresaId: "empresa-perfil-teste",
      nome: "Admin de teste",
      email: "admin@empresa-teste.local",
      tipo: "ADMIN",
      ...data,
    }),
  },
  empresa: {
    update: async ({ where, data }) => {
      atualizacoesEmpresa.push({ where, data });
      return { id: where.id, ...data };
    },
  },
};

// Substitui o acesso Prisma por operações em memória antes de carregar as rotas.
const caminhoDb = require.resolve("../src/config/db");
require.cache[caminhoDb] = {
  id: caminhoDb,
  filename: caminhoDb,
  loaded: true,
  exports: { getPrisma: () => prismaFalso, isDbConfigured: () => true },
};

// Carrega as rotas e o middleware de sessão depois de preparar o Prisma falso.
const app = require("../index");
const authMiddleware = require("../src/middlewares/authMiddleware");
const jwt = require("jsonwebtoken");

// Invoca os handlers Express diretamente, sem abrir porta ou conectar ao banco.
async function invocarRota(metodo, caminho, { usuario, body = {} } = {}) {
  // Localiza a rota e confirma que o caminho esperado continua disponível.
  const camada = app.router.stack.find((item) => item.route?.path === caminho && item.route.methods[metodo.toLowerCase()]);
  assert.ok(camada, `A rota ${metodo} ${caminho} deve existir`);
  // Preenche o cache do middleware para evitar qualquer consulta externa.
  if (usuario) authMiddleware.guardarSessao(usuario);
  // Cria um token curto usando apenas a chave definida neste teste.
  const token = usuario ? jwt.sign(usuario, process.env.JWT_SECRET) : null;
  // Monta uma requisição mínima compatível com os handlers da rota.
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {}, body, params: {}, query: {} };
  // Guarda o código e o JSON devolvidos pelo Express simulado.
  const res = {
    statusCode: 200,
    body: undefined,
    status(codigo) { this.statusCode = codigo; return this; },
    json(dados) { this.body = dados; return this; },
  };
  // Executa a cadeia de middleware e o handler da rota em ordem.
  const handlers = camada.route.stack.map((item) => item.handle);
  async function executar(indice) {
    if (indice >= handlers.length) return;
    let proxima;
    await handlers[indice](req, res, () => {
      proxima = executar(indice + 1);
      return proxima;
    });
    if (proxima) await proxima;
  }
  // Aguarda a rota concluir antes de devolver a resposta simulada.
  await executar(0);
  return { status: res.statusCode, body: res.body };
}

// Usa os campos antigos obrigatórios e permite sobrepor os novos campos em cada caso.
function dadosCadastro(campos = {}) {
  return {
    empresa: "Empreiteira de teste",
    nome: "Admin de teste",
    email: `admin${registrosEmpresa.length}@empresa-teste.local`,
    senha: "senha-segura-de-teste",
    cnpj: "11222333000181",
    cpfResponsavel: "52998224725",
    telefone: "11999990000",
    telefoneSecundario: "",
    enderecoResponsavel: "Rua do Responsável, 10",
    endereco: "Avenida da Empresa, 20",
    ...campos,
  };
}

// Agrupa os cenários de cadastro e perfil da empresa.
describe("cadastro e perfil da empresa", () => {
  // Zera somente os registros em memória antes de cada cenário.
  beforeEach(() => {
    registrosEmpresa.splice(0);
    atualizacoesEmpresa.splice(0);
  });

  // Confirma persistência dos novos campos e compatibilidade com clientes antigos.
  it("grava slogan e endereço completo e ainda aceita cadastro sem os campos opcionais", async () => {
    // Envia o conjunto completo de dados opcionais para a rota de cadastro genérica.
    const respostaNova = await invocarRota("POST", "/auth/registro-empreiteira", {
      body: dadosCadastro({ slogan: "Obras com cuidado", estado: "SP", cidade: "Santos", bairro: "Centro", numero: "20", complemento: "Sala 2" }),
    });
    // Confirma a criação normal da empresa e da primeira conta administrativa.
    assert.equal(respostaNova.status, 201);
    // Confere que os campos novos foram enviados à criação da empresa.
    assert.equal(registrosEmpresa[0].slogan, "Obras com cuidado");
    assert.equal(registrosEmpresa[0].estado, "SP");
    assert.equal(registrosEmpresa[0].cidade, "Santos");
    assert.equal(registrosEmpresa[0].bairro, "Centro");
    assert.equal(registrosEmpresa[0].numero, "20");
    assert.equal(registrosEmpresa[0].complemento, "Sala 2");

    // Envia somente os campos já obrigatórios para simular uma integração antiga.
    const respostaAntiga = await invocarRota("POST", "/auth/registro-empreiteira", { body: dadosCadastro() });
    // Confirma que o corpo antigo segue aceito e não inventa valores novos.
    assert.equal(respostaAntiga.status, 201);
    assert.equal("slogan" in registrosEmpresa[1], false);
    assert.equal("estado" in registrosEmpresa[1], false);
  });

  // Confirma que slogan pode ser alterado por ADMIN e continua protegido por perfil.
  it("permite ao ADMIN alterar o slogan e mantém o bloqueio para outros perfis", async () => {
    // Prepara uma sessão administrativa válida apenas dentro deste teste.
    const admin = { id: "admin-slogan-teste", email: "admin@empresa-teste.local", tipo: "ADMIN", empresaId: "empresa-perfil-teste" };
    // Envia o slogan no objeto empresa aceito pelo PATCH existente.
    const respostaAdmin = await invocarRota("PATCH", "/usuarios/me", { usuario: admin, body: { empresa: { slogan: "Reformas bem feitas" } } });
    // Confirma que o slogan salvo também aparece no retorno para atualizar o Perfil.
    assert.equal(respostaAdmin.status, 200);
    assert.equal(atualizacoesEmpresa[0].data.slogan, "Reformas bem feitas");
    assert.equal(respostaAdmin.body.usuario.empresa.slogan, "Reformas bem feitas");

    // Tenta alterar o slogan com perfil CLIENTE para preservar as permissões atuais.
    const cliente = { id: "cliente-slogan-teste", email: "cliente@empresa-teste.local", tipo: "CLIENTE", empresaId: "empresa-perfil-teste" };
    const respostaCliente = await invocarRota("PATCH", "/usuarios/me", { usuario: cliente, body: { empresa: { slogan: "Não autorizado" } } });
    // Confirma que o middleware de perfil impede a alteração da empresa.
    assert.equal(respostaCliente.status, 403);
    assert.equal(atualizacoesEmpresa.length, 1);
  });

  // Confirma limite e tipo do slogan sem exigir chamadas ao banco.
  it("rejeita slogan inválido no perfil", async () => {
    // Usa a sessão administrativa simulada para exercitar a validação do PATCH.
    const admin = { id: "admin-slogan-invalido", email: "admin@empresa-teste.local", tipo: "ADMIN", empresaId: "empresa-perfil-teste" };
    // Envia um valor de tipo incorreto para a API.
    const resposta = await invocarRota("PATCH", "/usuarios/me", { usuario: admin, body: { empresa: { slogan: true } } });
    // Confirma a resposta de validação e ausência de atualização persistida.
    assert.equal(resposta.status, 400);
    assert.equal(atualizacoesEmpresa.length, 0);
  });
});
