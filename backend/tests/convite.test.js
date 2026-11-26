const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");

const empresaId = "empresa-convite-a";
const administrador = { id: "admin-convite-a", empresaId, nome: "Admin", email: "admin@convite.local", tipo: "ADMIN" };
let usuarios;
let obras;
let convites;
let funcionarios;
let escalas;
let eventos;
let parcelas;
let contratos;
let notificacoes;

function selecionar(registro, select) {
  if (!registro || !select) return registro;
  return Object.fromEntries(Object.entries(select).filter(([, incluir]) => incluir === true).map(([campo]) => [campo, registro[campo]]));
}

function criarPrisma() {
  const prisma = {
    usuario: {
      findUnique: async ({ where, select }) => selecionar(usuarios.find((item) => Object.entries(where).every(([chave, valor]) => item[chave] === valor)) || null, select),
      findMany: async ({ where }) => usuarios.filter((item) => item.empresaId === where.empresaId && item.tipo === where.tipo).map(({ id }) => ({ id })),
      create: async ({ data }) => { const item = { id: `usuario-${usuarios.length}`, criadoEm: new Date(), ...data }; usuarios.push(item); return item; },
      update: async ({ where, data }) => { const item = usuarios.find((usuario) => usuario.id === where.id); Object.assign(item, data); return item; },
    },
    obra: {
      findFirst: async ({ where, include }) => {
        const obra = obras.find((item) => Object.entries(where).every(([chave, valor]) => item[chave] === valor)) || null;
        if (!obra || !include) return obra;
        return { ...obra, empresa: { nome: "Empreiteira A" }, cliente: null };
      },
      updateMany: async ({ where, data }) => {
        const obra = obras.find((item) => Object.entries(where).every(([chave, valor]) => item[chave] === valor));
        if (!obra) return { count: 0 };
        Object.assign(obra, data);
        return { count: 1 };
      },
      update: async ({ where, data }) => {
        const obra = obras.find((item) => item.id === where.id);
        if (!obra) throw Object.assign(new Error("Obra ausente"), { code: "P2025" });
        Object.assign(obra, data);
        return obra;
      },
    },
    convite: {
      findUnique: async ({ where, include }) => {
        const convite = convites.find((item) => Object.entries(where).every(([chave, valor]) => item[chave] === valor)) || null;
        if (!convite || !include) return convite;
        return { ...convite, empresa: { nome: "Empreiteira A" }, obra: { nome: obras.find((obra) => obra.id === convite.obraId)?.nome } };
      },
      findFirst: async ({ where }) => convites.find((item) => Object.entries(where).every(([chave, valor]) => {
        if (chave === "expiraEm" && valor?.gt) return item.expiraEm > valor.gt;
        return item[chave] === valor;
      })) || null,
      create: async ({ data }) => { const item = { id: `convite-${convites.length + 1}`, usadoEm: null, ...data }; convites.push(item); return item; },
      updateMany: async ({ where, data }) => {
        const item = convites.find((convite) => Object.entries(where).every(([chave, valor]) => {
          if (chave === "expiraEm" && valor?.gt) return convite.expiraEm > valor.gt;
          return convite[chave] === valor;
        }));
        if (!item) return { count: 0 };
        Object.assign(item, data);
        return { count: 1 };
      },
    },
    funcionario: {
      findUnique: async ({ where }) => funcionarios.find((item) => Object.entries(where).every(([chave, valor]) => item[chave] === valor)) || null,
      create: async ({ data }) => { const item = { id: `funcionario-${funcionarios.length + 1}`, ativo: true, ...data }; funcionarios.push(item); return item; },
    },
    obraEscala: {
      findFirst: async ({ where }) => escalas.find((item) => Object.entries(where).every(([chave, valor]) => item[chave] === valor)) || null,
      create: async ({ data }) => { const item = { id: `escala-${escalas.length + 1}`, ...data }; escalas.push(item); return item; },
    },
    obraEvento: {
      create: async ({ data }) => { const item = { id: `evento-${eventos.length + 1}`, ...data }; eventos.push(item); return item; },
    },
    parcela: {
      count: async ({ where }) => parcelas.filter((item) => item.obraId === where.obraId && (!where.situacao || item.situacao === where.situacao)).length,
      findMany: async ({ where }) => parcelas.filter((item) => item.obraId === where.obraId).map((item) => ({ ...item, pagamentos: [] })),
      update: async ({ where, data }) => { const item = parcelas.find((parcela) => parcela.id === where.id); Object.assign(item, data); return item; },
      create: async ({ data }) => { const item = { id: `parcela-${parcelas.length + 1}`, situacao: "PENDENTE", ...data }; parcelas.push(item); return item; },
      delete: async ({ where }) => { const indice = parcelas.findIndex((item) => item.id === where.id); return parcelas.splice(indice, 1)[0]; },
      updateMany: async ({ where, data }) => { const item = parcelas.find((parcela) => parcela.obraId === where.obraId && parcela.numero === where.numero); if (!item) return { count: 0 }; Object.assign(item, data); return { count: 1 }; },
    },
    contrato: {
      upsert: async ({ where, create, update }) => { let item = contratos.find((contrato) => contrato.obraId === where.obraId); if (item) Object.assign(item, update); else { item = { id: `contrato-${contratos.length + 1}`, ...create }; contratos.push(item); } return item; },
    },
    pagamento: { count: async () => 0 },
    notificacao: {
      create: async ({ data }) => { const item = { id: `notificacao-${notificacoes.length + 1}`, ...data }; notificacoes.push(item); return item; },
      createMany: async ({ data }) => { notificacoes.push(...data); return { count: data.length }; },
    },
    $transaction: async (callback) => callback(prisma),
  };
  return prisma;
}

const dbPath = require.resolve("../src/config/db");
const usuarioRepositoryPath = require.resolve("../src/repositories/usuarioRepository");
const cloudinaryServicePath = require.resolve("../src/services/cloudinaryService");
const prisma = criarPrisma();
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { getPrisma: () => prisma, isDbConfigured: () => true } };
require.cache[cloudinaryServicePath] = { id: cloudinaryServicePath, filename: cloudinaryServicePath, loaded: true, exports: { enviarContratoObra: async () => "https://res.cloudinary.com/teste/raw/upload/contrato.pdf", enviarFotoObra: async () => "https://res.cloudinary.com/teste/image/upload/foto.png" } };
require.cache[usuarioRepositoryPath] = {
  id: usuarioRepositoryPath, filename: usuarioRepositoryPath, loaded: true,
  exports: {
    listarUsuarios: async () => [], buscarUsuarioPorEmail: async () => null, buscarUsuarioPorId: async () => null,
    buscarAutenticacaoUsuarioPorId: async (id) => {
      const usuario = usuarios.find((item) => item.id === id);
      if (!usuario) return null;
      const funcionario = funcionarios.find((item) => item.usuarioId === id);
      return { id: usuario.id, email: usuario.email, tipo: usuario.tipo, empresaId: usuario.empresaId, funcionario: funcionario ? { empresaId: funcionario.empresaId, ativo: funcionario.ativo } : null };
    },
    buscarPerfilUsuarioPorId: async (id) => selecionar(usuarios.find((item) => item.id === id) || null, { id: true, empresaId: true, nome: true, email: true, tipo: true }),
    buscarFuncionarioPorUsuarioId: async (usuarioId) => funcionarios.find((item) => item.usuarioId === usuarioId) || null,
    atualizarSenhaUsuario: async () => null, criarUsuarioColaborador: async () => null,
  },
};
process.env.JWT_SECRET = "segredo-testes-convite";
const app = require("../index");

function token(usuario = administrador) {
  return jwt.sign({ id: usuario.id, email: usuario.email, tipo: usuario.tipo, empresaId: usuario.empresaId }, process.env.JWT_SECRET);
}

async function chamar(metodo, caminho, { body = {}, params = {}, usuario = administrador } = {}) {
  const camada = app.router.stack.find((item) => item.route?.path === caminho && item.route.methods[metodo.toLowerCase()]);
  assert.ok(camada, `Rota ${metodo} ${caminho} deve existir`);
  const req = { headers: usuario ? { authorization: `Bearer ${token(usuario)}` } : {}, body, params, get: () => "localhost:3000", protocol: "http" };
  const res = { statusCode: 200, body: undefined, status(codigo) { this.statusCode = codigo; return this; }, json(dados) { this.body = dados; return this; } };
  const handlers = camada.route.stack.map((item) => item.handle);
  async function executar(indice) {
    if (indice >= handlers.length) return;
    let seguinte;
    await handlers[indice](req, res, () => { seguinte = executar(indice + 1); return seguinte; });
    if (seguinte) await seguinte;
  }
  await executar(0);
  return res;
}

describe("Convites de cliente e gerente por obra", () => {
  beforeEach(() => {
    usuarios = [{ ...administrador }];
    obras = [{ id: "obra-convite-a", empresaId, nome: "Obra A", clienteId: null, valorBase: "1000.00", valorTotal: "1000.00", quantidadeParcelas: 2, excluidaEm: null }];
    convites = [];
    funcionarios = [];
    escalas = [];
    eventos = [];
    parcelas = [
      { id: "parcela-1", obraId: "obra-convite-a", numero: 1, valor: "500.00", situacao: "PENDENTE" },
      { id: "parcela-2", obraId: "obra-convite-a", numero: 2, valor: "500.00", situacao: "PENDENTE" },
    ];
    contratos = [];
    notificacoes = [];
  });

  it("cria conta de cliente, limita o vínculo à obra convidada e consome o link uma vez", async () => {
    const criado = await chamar("POST", "/convites/cliente", { body: { obraId: "obra-convite-a", nome: "Cliente A", email: "cliente@teste.local", telefone: "11987654321", endereco: "Rua A", estado: "SP", cidade: "Santos", bairro: "Centro", numero: "100", apartamento: "12", bloco: "A", semApartamento: false, semBloco: false, quantidadeParcelas: 3, vencimentoInicial: "2026-12-10", contrato: { data: "data:application/pdf;base64,AA==", mimeType: "application/pdf" } } });
    assert.equal(criado.statusCode, 201);
    assert.match(criado.body.convite.link, /^http:\/\/localhost:5173\/convite\//);
    const codigo = criado.body.convite.link.split("/").at(-1);
    const consulta = await chamar("GET", "/convites/:token", { params: { token: codigo }, usuario: null });
    assert.equal(consulta.statusCode, 200);
    assert.equal(consulta.body.obra, "Obra A");
    // Confirma que o GET de cliente entrega uma dica mascarada, sem e-mail completo.
    assert.equal(consulta.body.emailDica, "cl******te@teste.local");
    // Garante que o campo antigo não possa expor o endereço completo para cliente.
    assert.equal(consulta.body.email, undefined);

    // Tenta aceitar sem e-mail e confirma que o convite segue intacto.
    const semEmail = await chamar("POST", "/convites/:token/aceitar", { params: { token: codigo }, body: { senha: "Senha-segura-123" }, usuario: null });
    assert.equal(semEmail.statusCode, 400);
    // Confirma o código próprio para e-mail ausente.
    assert.equal(semEmail.body.codigo, "EMAIL_CONVITE_OBRIGATORIO");
    // Confirma a orientação em português para informar o endereço.
    assert.equal(semEmail.body.erro, "Informe o e-mail do convite.");
    // Confirma que o erro não criou cliente nem consumiu o convite.
    assert.equal(usuarios.filter((item) => item.tipo === "CLIENTE").length, 0);
    assert.equal(convites[0].usadoEm, null);

    // Tenta aceitar com e-mail vazio e confirma a mesma recusa genérica.
    const emailVazio = await chamar("POST", "/convites/:token/aceitar", { params: { token: codigo }, body: { email: "   ", senha: "Senha-segura-123" }, usuario: null });
    assert.equal(emailVazio.statusCode, 400);
    // Garante que o e-mail vazio recebe o mesmo código do e-mail ausente.
    assert.equal(emailVazio.body.codigo, semEmail.body.codigo);
    // Confirma que um e-mail vazio também não cria conta nem consome o convite.
    assert.equal(usuarios.filter((item) => item.tipo === "CLIENTE").length, 0);
    assert.equal(convites[0].usadoEm, null);

    // Tenta aceitar com outro e-mail e confirma que o endereço do convite não é revelado.
    const emailErrado = await chamar("POST", "/convites/:token/aceitar", { params: { token: codigo }, body: { email: "outro@teste.local", senha: "Senha-segura-123" }, usuario: null });
    assert.equal(emailErrado.statusCode, 400);
    // Confirma o código próprio para e-mail divergente.
    assert.equal(emailErrado.body.codigo, "EMAIL_CONVITE_DIVERGENTE");
    // Confirma a mensagem explícita aprovada sem repetir o endereço convidado.
    assert.equal(emailErrado.body.erro, "O e-mail informado não confere com o do convite. Confira o endereço e tente novamente.");
    // Garante que a resposta não revela o e-mail verdadeiro do convite.
    assert.equal(emailErrado.body.erro.includes("cliente@teste.local"), false);
    // Confirma que a tentativa incorreta não cria usuário nem marca o convite como usado.
    assert.equal(usuarios.filter((item) => item.tipo === "CLIENTE").length, 0);
    assert.equal(convites[0].usadoEm, null);

    // Confirma que o endpoint também bloqueia senha fraca para cliente sem sessão.
    const senhaFracaCliente = await chamar("POST", "/convites/:token/aceitar", { params: { token: codigo }, body: { email: "cliente@teste.local", senha: "senha-segura-123" }, usuario: null });
    assert.equal(senhaFracaCliente.statusCode, 400);
    // Confirma que a resposta identifica a regra de maiúscula em português.
    assert.equal(senhaFracaCliente.body.codigo, "SENHA_MAIUSCULA");
    // Confirma que a rejeição da senha não cria conta nem consome o convite.
    assert.equal(usuarios.filter((item) => item.tipo === "CLIENTE").length, 0);
    assert.equal(convites[0].usadoEm, null);

    // Aceita com e-mail correto após remover espaços e ignorar maiúsculas.
    const aceite = await chamar("POST", "/convites/:token/aceitar", { params: { token: codigo }, body: { email: "  CLIENTE@TESTE.LOCAL  ", senha: "Senha-segura-123" }, usuario: null });
    assert.equal(aceite.statusCode, 200);
    assert.equal(aceite.body.usuario.tipo, "CLIENTE");
    assert.equal(usuarios.find((item) => item.id === aceite.body.usuario.id).cidade, "Santos");
    assert.equal(obras[0].clienteId, aceite.body.usuario.id);
    assert.equal(obras[0].quantidadeParcelas, 3);
    assert.equal(parcelas.length, 3);
    assert.equal(parcelas[0].numero, 1);
    assert.equal(parcelas[2].numero, 3);
    assert.equal(contratos[0].arquivoUrl, "https://res.cloudinary.com/teste/raw/upload/contrato.pdf");
    assert.equal(convites[0].usadoEm instanceof Date, true);

    const reutilizado = await chamar("POST", "/convites/:token/aceitar", { params: { token: codigo }, body: { senha: "Senha-segura-123" }, usuario: null });
    assert.equal(reutilizado.statusCode, 410);
    assert.equal(usuarios.filter((item) => item.tipo === "CLIENTE").length, 1);
  });

  // A dica mascara a parte local com seis asteriscos e conserva o domínio inteiro.
  it("mascara endereços longos e curtos sem revelar o tamanho da parte local", async () => {
    // Reúne exemplos longos, curtos e domínios sem ponto para validar a saída do GET.
    const casos = [
      { email: "jane.doe97@gmail.com", dica: "ja******97@gmail.com" },
      { email: "abcdef@dominio", dica: "ab******ef@dominio" },
      { email: "abcde@localhost", dica: "a******@localhost" },
      { email: "abc@domain", dica: "a******@domain" },
      { email: "ab@nodot", dica: "******@nodot" },
      { email: "a@domain", dica: "******@domain" },
    ];
    // Executa cada exemplo pela rota pública de consulta do convite.
    for (let indice = 0; indice < casos.length; indice += 1) {
      // Seleciona o endereço e a dica esperada para esta passagem.
      const caso = casos[indice];
      // Cria um token de teste único para a consulta simulada.
      const codigo = `mascara-${indice}`;
      // Registra um convite de cliente em memória com o hash esperado pela rota.
      convites.push({ id: `convite-mascara-${indice}`, tokenHash: crypto.createHash("sha256").update(codigo).digest("hex"), empresaId, tipo: "CLIENTE", nome: "Cliente teste", email: caso.email, obraId: null, expiraEm: new Date(Date.now() + 60_000), usadoEm: null });
      // Consulta a dica por meio do endpoint, sem acessar banco compartilhado.
      const consulta = await chamar("GET", "/convites/:token", { params: { token: codigo }, usuario: null });
      // Confirma o formato de máscara definido para o endereço.
      assert.equal(consulta.body.emailDica, caso.dica);
      // Garante que o campo completo não seja devolvido para clientes.
      assert.equal(consulta.body.email, undefined);
      // Garante que a dica jamais seja igual ao e-mail verdadeiro.
      assert.notEqual(consulta.body.emailDica, caso.email);
    }
  });

  // Convites novos usam quantidade e valor total já definidos na obra.
  it("aceita cliente sem quantidade no convite e usa parcelas e total da obra", async () => {
    // Representa uma obra cujo total já inclui a regra de cobrança vigente.
    obras[0].valorBase = "1000.00";
    obras[0].valorTotal = "1010.00";
    obras[0].quantidadeParcelas = 13;

    // O payload novo informa vencimento e contrato, mas não quantidade.
    const criado = await chamar("POST", "/convites/cliente", { body: { obraId: "obra-convite-a", nome: "Cliente Novo", email: "novo@teste.local", telefone: "11987654321", endereco: "Rua A", estado: "SP", cidade: "Santos", bairro: "Centro", numero: "100", apartamento: "12", bloco: "A", semApartamento: false, semBloco: false, vencimentoInicial: "2026-12-10", contrato: { data: "data:application/pdf;base64,AA==", mimeType: "application/pdf" } } });
    assert.equal(criado.statusCode, 201);
    assert.equal(convites[0].quantidadeParcelas, null);

    // O aceite gera as parcelas conforme quantidade e total da obra.
    const codigo = criado.body.convite.link.split("/").at(-1);
    const aceite = await chamar("POST", "/convites/:token/aceitar", { params: { token: codigo }, body: { email: "novo@teste.local", senha: "Senha-segura-123" }, usuario: null });
    assert.equal(aceite.statusCode, 200);
    assert.equal(obras[0].quantidadeParcelas, 13);
    assert.equal(Number(obras[0].valorTotal), 1010);
    assert.equal(parcelas.length, obras[0].quantidadeParcelas);
    assert.equal(Math.round(parcelas.reduce((soma, parcela) => soma + Number(parcela.valor), 0) * 100) / 100, Number(obras[0].valorTotal));
    assert.equal(parcelas[0].vencimento.toISOString().slice(0, 10), "2026-12-10");
    assert.equal(contratos[0].arquivoUrl, "https://res.cloudinary.com/teste/raw/upload/contrato.pdf");
  });

  // A API não permite uma segunda vinculação a uma obra ocupada.
  it("recusa convite para obra que já tem cliente vinculado", async () => {
    // Simula uma obra com cliente vinculado antes do novo convite.
    obras[0].clienteId = "cliente-existente";
    const resposta = await chamar("POST", "/convites/cliente", { body: { obraId: "obra-convite-a", nome: "Cliente Novo", email: "novo@teste.local", telefone: "11987654321", endereco: "Rua A", estado: "SP", cidade: "Santos", bairro: "Centro", numero: "100", apartamento: "12", bloco: "A", semApartamento: false, semBloco: false, vencimentoInicial: "2026-12-10", contrato: { data: "data:application/pdf;base64,AA==", mimeType: "application/pdf" } } });
    assert.equal(resposta.statusCode, 409);
    assert.match(resposta.body.erro, /vinculada a um cliente/i);
  });

  it("cria gerente responsável e concede escala somente para a obra do convite", async () => {
    const criado = await chamar("POST", "/convites/gerente", { body: { obraId: "obra-convite-a", nome: "Gerente A", email: "gerente@teste.local", telefone: "11987654321", funcao: "Gerente de obras" } });
    assert.equal(criado.statusCode, 201);
    const codigo = criado.body.convite.link.split("/").at(-1);
    // Confirma que o GET do gerente continua devolvendo o e-mail usado pelo fluxo atual.
    const consulta = await chamar("GET", "/convites/:token", { params: { token: codigo }, usuario: null });
    assert.equal(consulta.body.email, "gerente@teste.local");
    // Confirma que gerente sem sessão também precisa criar senha conforme a regra nova.
    const senhaFraca = await chamar("POST", "/convites/:token/aceitar", { params: { token: codigo }, body: { senha: "senha-segura-123" }, usuario: null });
    assert.equal(senhaFraca.statusCode, 400);
    // Confirma o mesmo código de maiúscula usado na criação de conta de cliente.
    assert.equal(senhaFraca.body.codigo, "SENHA_MAIUSCULA");
    // Confirma que a senha fraca não cria funcionário nem consome o convite.
    assert.equal(funcionarios.length, 0);
    assert.equal(convites[0].usadoEm, null);
    const aceite = await chamar("POST", "/convites/:token/aceitar", { params: { token: codigo }, body: { senha: "Senha-segura-123" }, usuario: null });
    assert.equal(aceite.statusCode, 200);
    assert.equal(aceite.body.usuario.tipo, "COLABORADOR");
    assert.equal(funcionarios[0].nivel, "RESPONSAVEL");
    assert.equal(escalas.length, 1);
    assert.equal(escalas[0].obraId, "obra-convite-a");
    assert.equal(escalas[0].funcionarioId, funcionarios[0].id);
    assert.equal(eventos.length, 1);
    assert.equal(eventos[0].tipo, "EQUIPE");
    assert.equal(eventos[0].visivelParaCliente, false);
    assert.equal(notificacoes.length, 2);
  });

  // Usuários já autenticados aceitam convite sem criar senha nova ou validar a política.
  it("mantém o aceite de cliente com sessão sem exigir e-mail nem nova senha", async () => {
    // Prepara uma conta existente com senha histórica que não participa desta validação.
    const cliente = { id: "cliente-com-sessao", empresaId, nome: "Cliente existente", email: "cliente@teste.local", tipo: "CLIENTE", senhaHash: "hash-antigo" };
    // Registra a conta no mock para que o JWT corresponda ao usuário salvo.
    usuarios.push(cliente);
    // Cria o convite para o mesmo e-mail e para a obra ainda sem cliente.
    const criado = await chamar("POST", "/convites/cliente", { body: { obraId: "obra-convite-a", nome: cliente.nome, email: cliente.email, telefone: "11987654321", endereco: "Rua A", estado: "SP", cidade: "Santos", bairro: "Centro", numero: "100", apartamento: "12", bloco: "A", semApartamento: false, semBloco: false, vencimentoInicial: "2026-12-10", contrato: { data: "data:application/pdf;base64,AA==", mimeType: "application/pdf" } } });
    // Confirma que o convite para a conta existente foi criado.
    assert.equal(criado.statusCode, 201);
    // Extrai o token único sem exibir ou persistir credenciais.
    const codigo = criado.body.convite.link.split("/").at(-1);
    // Aceita com a sessão existente e sem enviar e-mail ou senha nova.
    const aceite = await chamar("POST", "/convites/:token/aceitar", { params: { token: codigo }, body: {}, usuario: cliente });
    // Confirma que o fluxo logado continua aceitando o convite.
    assert.equal(aceite.statusCode, 200);
    // Confirma que a conta antiga foi reutilizada sem substituir sua senha salva.
    assert.equal(aceite.body.usuario.id, cliente.id);
    assert.equal(usuarios.find((item) => item.id === cliente.id).senhaHash, "hash-antigo");
    // Confirma que a obra foi ligada ao cliente já autenticado.
    assert.equal(obras[0].clienteId, cliente.id);
  });

  // Convites vencidos continuam recusados mesmo quando o e-mail informado é válido.
  it("recusa convite expirado sem criar usuário", async () => {
    // Cria um convite de cliente válido pela rota administrativa existente.
    const criado = await chamar("POST", "/convites/cliente", { body: { obraId: "obra-convite-a", nome: "Cliente A", email: "cliente@teste.local", telefone: "11987654321", endereco: "Rua A", estado: "SP", cidade: "Santos", bairro: "Centro", numero: "100", apartamento: "12", bloco: "A", semApartamento: false, semBloco: false, vencimentoInicial: "2026-12-10", contrato: { data: "data:application/pdf;base64,AA==", mimeType: "application/pdf" } } });
    // Confirma que o convite foi criado antes de simular a expiração.
    assert.equal(criado.statusCode, 201);
    // Expira o registro em memória sem alterar ou acessar banco compartilhado.
    convites[0].expiraEm = new Date(Date.now() - 1000);
    // Tenta aceitar o token já expirado com os dados que seriam válidos.
    const codigo = criado.body.convite.link.split("/").at(-1);
    const aceite = await chamar("POST", "/convites/:token/aceitar", { params: { token: codigo }, body: { email: "cliente@teste.local", senha: "Senha-segura-123" }, usuario: null });
    // Preserva o status existente para convite inválido, expirado ou usado.
    assert.equal(aceite.statusCode, 410);
    // Confirma que a expiração não cria usuário nem consome o convite.
    assert.equal(usuarios.filter((item) => item.tipo === "CLIENTE").length, 0);
    assert.equal(convites[0].usadoEm, null);
  });

  it("exige que o cliente esteja vinculado a uma obra e tenha contrato e parcelas", async () => {
    const dados = { nome: "Cliente A", email: "cliente@teste.local", telefone: "11987654321", endereco: "Rua do Cliente", estado: "SP", cidade: "Santos", bairro: "Centro", numero: "90", apartamento: "1", bloco: "A", semApartamento: false, semBloco: false, quantidadeParcelas: 2, vencimentoInicial: "2026-12-10", contrato: { data: "data:application/pdf;base64,AA==", mimeType: "application/pdf" } };
    const semObra = await chamar("POST", "/convites/cliente", { body: { ...dados, obraId: "" } });
    assert.equal(semObra.statusCode, 400);
    const semContrato = await chamar("POST", "/convites/cliente", { body: { ...dados, obraId: "obra-convite-a", contrato: undefined } });
    assert.equal(semContrato.statusCode, 400);
    assert.equal(convites.length, 0);
  });

  it("nega criação de convite sem sessão administrativa e convite para outra empresa", async () => {
    const body = { obraId: "obra-convite-a", nome: "Cliente", email: "cliente@teste.local", telefone: "11987654321", endereco: "Rua A", estado: "SP", cidade: "Santos", bairro: "Centro", numero: "100", apartamento: "1", bloco: "A", semApartamento: false, semBloco: false, quantidadeParcelas: 2, vencimentoInicial: "2026-12-10", contrato: { data: "data:application/pdf;base64,AA==", mimeType: "application/pdf" } };
    const semSessao = await chamar("POST", "/convites/cliente", { body, usuario: null });
    assert.equal(semSessao.statusCode, 401);
    const obraAlheia = await chamar("POST", "/convites/cliente", { body: { ...body, obraId: "obra-fora-da-empresa" } });
    assert.equal(obraAlheia.statusCode, 404);
    assert.equal(convites.length, 0);
  });
});
