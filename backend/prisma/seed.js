// =============================================================================
// SEED DE TESTE - ObraMaster
// =============================================================================
// Este arquivo é responsável por popular o banco de dados com dados iniciais
// para facilitar os testes manuais durante o desenvolvimento da aplicação.
//
// O que este script faz:
// 1. Carrega as variáveis de ambiente do arquivo .env
// 2. Bloqueia a execução caso esteja rodando em ambiente de produção (NODE_ENV=production)
// 3. Exige confirmação explícita via variável de ambiente (SEED_CONFIRMA=sim)
// 4. Procura uma empresa chamada "Empresa Teste" (cria se ainda não existir)
// 5. Cria 3 usuários de teste (ADMIN, COLABORADOR e CLIENTE) vinculados a essa empresa
// 6. Utiliza 'upsert' com update vazio para não alterar usuários existentes e evitar duplicações
// 7. Encerra a conexão com o banco de dados com segurança no bloco 'finally'
// =============================================================================

// Importa o módulo nativo 'path' do Node.js, utilizado para resolver e montar caminhos de arquivos
const path = require("path");

// Importa a biblioteca 'dotenv', que lê arquivos .env e carrega as variáveis em 'process.env'
const dotenv = require("dotenv");

// Carrega as variáveis de ambiente a partir do arquivo .env localizado na pasta backend (um nível acima de prisma/)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Também chamamos dotenv.config() como garantia caso o comando seja disparado a partir da raiz da pasta backend
dotenv.config();

// Importa a classe PrismaClient do pacote @prisma/client para permitir a comunicação com o PostgreSQL
const { PrismaClient } = require("@prisma/client");

// Importa a biblioteca 'bcrypt', utilizada para criptografia e geração de hash seguro de senhas
const bcrypt = require("bcrypt");

// Instancia o cliente do Prisma que será utilizado para executar as consultas no banco de dados
const prisma = new PrismaClient();

// =============================================================================
// Constantes e Dados Iniciais de Teste
// =============================================================================

// Nome da empresa de testes que servirá de escopo para os usuários
const NOME_EMPRESA_TESTE = "Empresa Teste";

// Senha padrão em texto puro que será compartilhada por todos os usuários de teste
const SENHA_PADRAO = "Teste@123";

// Custo de processamento (salt rounds) do bcrypt; 10 é o valor padrão recomendado pela indústria
const BCRYPT_ROUNDS = 10;

// Lista com as informações dos 3 usuários de teste a serem garantidos no banco
const USUARIOS_TESTE = [
  {
    nome: "Admin Teste",
    email: "admin@teste.com",
    tipo: "ADMIN",
  },
  {
    nome: "Colaborador Teste",
    email: "colaborador@teste.com",
    tipo: "COLABORADOR",
  },
  {
    nome: "Cliente Teste",
    email: "cliente@teste.com",
    tipo: "CLIENTE",
  },
];

// =============================================================================
// Lógica Principal de Inserção do Seed
// =============================================================================

// Função assíncrona que contém toda a lógica de criação e verificação dos dados no banco
async function executarSeed() {
  // ---------------------------------------------------------------------------
  // 1. Verificação de Segurança de Ambiente
  // ---------------------------------------------------------------------------
  // Verificamos a variável de ambiente NODE_ENV para saber em qual ambiente estamos rodando.
  // Se for "production", lançamos um erro para interromper imediatamente a execução
  // e proteger o banco de dados de produção contra a inserção de dados fictícios.
  if (process.env.NODE_ENV === "production") {
    // Lança uma exceção (Error) que interrompe o fluxo e será capturada pelo catch da função main(),
    // permitindo que o bloco finally feche a conexão com o banco e o processo encerre com código 1.
    throw new Error("O seed de teste não pode ser executado em ambiente de produção (NODE_ENV=production)!");
  }

  // ---------------------------------------------------------------------------
  // 2. Confirmação Explícita de Execução (Segunda Trava de Segurança)
  // ---------------------------------------------------------------------------
  // Exigimos que a variável de ambiente SEED_CONFIRMA tenha o valor exato "sim".
  // Esta verificação protege contra execuções acidentais em qualquer ambiente,
  // impedindo o avanço do script antes de realizar qualquer acesso ao banco de dados.
  if (process.env.SEED_CONFIRMA !== "sim") {
    // Lança um erro detalhado caso a variável não contenha exatamente o valor "sim",
    // instruindo o usuário a executar com SEED_CONFIRMA=sim para confirmar que sabe o que está fazendo.
    throw new Error("É preciso rodar com SEED_CONFIRMA=sim para confirmar que sabe o que está fazendo.");
  }

  // Mensagem informativa no console para acompanhar o progresso
  console.log("Iniciando execução do seed de dados de teste...");

  // ---------------------------------------------------------------------------
  // 3. Geração do Hash da Senha com Bcrypt
  // ---------------------------------------------------------------------------
  // Nunca salvamos senhas em texto puro no banco de dados.
  // Usamos bcrypt.hash para gerar uma versão criptografada e segura da senha "Teste@123".
  console.log("Gerando hash da senha padrão de teste com bcrypt (custo 10)...");
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, BCRYPT_ROUNDS);

  // ---------------------------------------------------------------------------
  // 4. Procura ou Criação da Empresa de Teste
  // ---------------------------------------------------------------------------
  // O campo 'nome' da Empresa não possui '@unique' no schema.prisma.
  // Por isso, usamos findFirst para verificar se já existe uma empresa com esse nome cadastrada.
  console.log(`Buscando se a empresa "${NOME_EMPRESA_TESTE}" já existe no banco...`);
  let empresa = await prisma.empresa.findFirst({
    where: {
      nome: NOME_EMPRESA_TESTE,
    },
  });

  // Se findFirst retornar null, significa que a empresa ainda não existe no banco
  if (!empresa) {
    console.log(`Empresa "${NOME_EMPRESA_TESTE}" não encontrada. Criando novo registro...`);
    // Criamos a empresa no banco de dados utilizando prisma.empresa.create
    empresa = await prisma.empresa.create({
      data: {
        nome: NOME_EMPRESA_TESTE,
      },
    });
    console.log(`Empresa criada com sucesso! (ID: ${empresa.id})`);
  } else {
    // Se a empresa já existe, apenas informamos e reaproveitamos o registro existente
    console.log(`Empresa já existente encontrada! (ID: ${empresa.id})`);
  }

  // ---------------------------------------------------------------------------
  // 5. Criação ou Garantia dos Usuários com Upsert
  // ---------------------------------------------------------------------------
  // Percorremos cada um dos 3 usuários da lista definida anteriormente
  for (const dadosUsuario of USUARIOS_TESTE) {
    console.log(`Processando usuário: ${dadosUsuario.email} (${dadosUsuario.tipo})...`);

    // Usamos o método 'upsert' do Prisma (update + insert):
    // - Procura no banco de dados pelo campo único 'email' (@unique no schema).
    // - Se já existir: aplica o objeto 'update' (que está vazio {}, logo não altera nada).
    // - Se não existir: aplica o objeto 'create' inserindo o novo usuário vinculado à empresa.
    // Desta forma, rodar o script 2 ou mais vezes é idempotente (não duplica nem gera erro).
    const usuario = await prisma.usuario.upsert({
      where: {
        // Campo de busca único: e-mail do usuário
        email: dadosUsuario.email,
      },
      // Objeto vazio: se o usuário já existir, mantemos intacto sem sobrescrever nada
      update: {},
      // Objeto de criação: usado se o usuário ainda não existir no banco
      create: {
        empresaId: empresa.id, // Chave estrangeira que vincula o usuário à "Empresa Teste"
        nome: dadosUsuario.nome, // Nome completo do usuário
        email: dadosUsuario.email, // E-mail único de login
        senhaHash: senhaHash, // Hash da senha gerado com bcrypt custo 10
        tipo: dadosUsuario.tipo, // Papel de acesso: ADMIN, COLABORADOR ou CLIENTE
      },
    });

    console.log(`Usuário garantido com sucesso: ${usuario.email} [${usuario.tipo}]`);
  }

  // Mensagem final de sucesso
  console.log("Seed de dados de teste finalizado com sucesso!");
}

// =============================================================================
// Orquestrador de Execução e Fechamento de Conexão
// =============================================================================

// Função principal que chama a execução do seed dentro de um bloco try/finally
async function main() {
  // Bloco try: tenta executar as operações do seed
  try {
    await executarSeed();
  } finally {
    // Bloco finally: SEMPRE será executado, ocorra sucesso ou erro na função acima.
    // É fundamental para desconectar o Prisma do banco e liberar a conexão de rede.
    console.log("Encerrando conexão do Prisma com o banco de dados...");
    await prisma.$disconnect();
  }
}

// Dispara a execução da função principal
main().catch((erro) => {
  // Bloco catch: captura qualquer exceção ou erro inesperado que ocorra durante o seed
  console.error("Falha ao executar o seed de teste:", erro);
  // Encerra o processo com código 1, sinalizando erro para o sistema operacional / CI
  process.exit(1);
});
