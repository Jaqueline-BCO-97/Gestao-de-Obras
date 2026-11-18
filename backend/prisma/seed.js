// Carrega as variáveis de ambiente do arquivo .env local.
require("dotenv").config();
// Importa a biblioteca usada para gerar hashes seguros de senha.
const bcrypt = require("bcrypt");
// Importa o cliente que permite acessar o banco por meio do Prisma.
const { PrismaClient } = require("@prisma/client");

// Define a senha comum das contas de demonstração.
const SENHA_DEMO = "Demo@12345";
// Define o custo computacional usado no hash das senhas.
const ROUNDS_BCRYPT = 10;
// Lista as contas necessárias para a demonstração.
const CONTAS_DEMO = [
  // Conta administrativa usada para gerenciar a empresa.
  { nome: "Administrador Demo", email: "admin@obramaster.demo", tipo: "ADMIN" },
  // Conta cliente usada como cliente de todas as obras do exemplo.
  { nome: "Cliente Demo", email: "cliente@obramaster.demo", tipo: "CLIENTE" },
  // Conta do colaborador Carlos, vinculada também ao cadastro de funcionário.
  { nome: "Carlos Eduardo da Silva", email: "colaborador@obramaster.demo", tipo: "COLABORADOR", telefone: "(11) 98765-4321" },
];

// Traduz os estados legíveis do mock para os valores do enum do banco.
const STATUS_OBRA = {
  // Mantém a obra programada para começar.
  "Agendada": "AGENDADA",
  // Marca a obra que está sendo executada.
  "Em andamento": "EM_ANDAMENTO",
  // Marca a obra que aguarda a conferência final.
  "Aguardando conferência": "AGUARDANDO_CONFERENCIA",
  // Marca a obra que foi concluída.
  "Concluída": "CONCLUIDA",
};
// Converte datas no padrão dia/mês/ano para objetos Date do JavaScript.
function dataPtBR(valor, hora = "12:00") {
  // Separa o dia, o mês e o ano informados no texto.
  const [dia, mes, ano] = valor.split("/").map(Number);
  // Separa a hora e os minutos para preservar a hora da timeline.
  const [horas, minutos] = hora.split(":").map(Number);
  // Cria a data usando UTC para evitar diferenças entre fusos horários.
  return new Date(Date.UTC(ano, mes - 1, dia, horas, minutos));
}
// Mantém os quatro exemplos de obra fornecidos pelo mock do frontend.
const OBRAS = [
  // Dados da primeira obra do exemplo.
  { titulo: "Construção Residencial Bela Vista", endereco: "Rua das Palmeiras, 120 - Gonzaga, Santos - SP", estado: "SP", cidade: "Santos", bairro: "Gonzaga", rua: "Rua das Palmeiras", numero: "120", semApartamento: true, semBloco: true, detalhes: "Execução de fundação, estrutura e alvenaria residencial. Materiais e medidas devem seguir o projeto aprovado e o contrato da obra.", status: "Agendada", valorTotal: 180000, prazo: "15/10/2026", colaboradores: [1, 2], parcelas: [{ situacao: "PENDENTE", vencimento: "15/04/2026" }, { situacao: "PENDENTE", vencimento: "15/08/2026" }], timeline: [
    // Cada registro replica a data, autoria, visibilidade, tipo e descrição do mock.
    { data: "05/03/2026", hora: "09:00", autor: "admin", tipo: "CONTRATACAO", visivel: true, descricao: "Contrato de prestação de serviços assinado e projeto arquitetônico finalizado." },
    { data: "12/03/2026", hora: "14:30", autor: "admin", tipo: "ORCAMENTO_APROVADO", visivel: true, descricao: "Alvará de construção emitido e aprovado pela Prefeitura Municipal." },
    { data: "01/04/2026", hora: "11:15", autor: "colaborador", tipo: "AGENDAMENTO", visivel: true, descricao: "Início da mobilização da equipe e maquinários agendado para meados de abril." },
    { data: "03/04/2026", hora: "16:00", autor: "colaborador", tipo: "EQUIPE", visivel: false, descricao: "Equipe de fundação definida e escala interna confirmada para a mobilização." },
    { data: "08/04/2026", hora: "08:30", autor: "colaborador", tipo: "STATUS", visivel: true, descricao: "Obra confirmada como agendada, com mobilização prevista para meados de abril." },
  ] },
  // Dados da segunda obra do exemplo.
  { titulo: "Reforma Completa de Apartamento Jardins", endereco: "Avenida Brasil, 850 - Itararé, São Vicente - SP", estado: "SP", cidade: "São Vicente", bairro: "Itararé", rua: "Avenida Brasil", numero: "850", semApartamento: true, semBloco: true, detalhes: "Reforma de apartamento com revisão elétrica e hidráulica, instalação de revestimentos e acabamento. Consultar as medidas e especificações do contrato antes de executar cada etapa.", status: "Em andamento", valorTotal: 75000, prazo: "25/05/2026", colaboradores: [1, 3], parcelas: [{ situacao: "PAGA", pagamento: "10/01/2026" }, { situacao: "PENDENTE", vencimento: "20/05/2026" }], timeline: [
    // Eventos da timeline mantêm as informações fornecidas no mock.
    { data: "08/01/2026", hora: "08:00", autor: "colaborador", tipo: "CONTRATACAO", visivel: true, descricao: "Demolição das paredes antigas e remoção de entulhos concluída." },
    { data: "10/01/2026", hora: "10:20", autor: "admin", tipo: "PAGAMENTO", visivel: true, descricao: "Pagamento da primeira parcela confirmado no sistema." },
    { data: "25/01/2026", hora: "15:45", autor: "colaborador", tipo: "STATUS", visivel: true, descricao: "Nova rede hidráulica em PPR e fiação elétrica de alta potência instaladas." },
    { data: "18/02/2026", hora: "13:10", autor: "colaborador", tipo: "ATUALIZACAO", visivel: true, descricao: "Construção de divisórias em drywall e nivelamento de contrapiso em execução." },
    { data: "20/02/2026", hora: "17:20", autor: "colaborador", tipo: "OCORRENCIA", visivel: false, descricao: "Acesso ao elevador de serviço precisa ser confirmado com a portaria antes da próxima entrega." },
    { data: "22/02/2026", hora: "09:40", autor: "colaborador", tipo: "STATUS", visivel: true, descricao: "Reforma em andamento, com instalações concluídas e acabamentos em execução." },
  ] },
  // Dados da terceira obra do exemplo.
  { titulo: "Modernização de Fachada Edifício Horizonte", endereco: "Rua Bahia, 2140 - Boqueirão, Praia Grande - SP", estado: "SP", cidade: "Praia Grande", bairro: "Boqueirão", rua: "Rua Bahia", numero: "2140", semApartamento: true, semBloco: true, detalhes: "Recuperação de fachada, troca de revestimentos e impermeabilização. Seguir o memorial descritivo, as áreas e os quantitativos definidos no contrato.", status: "Aguardando conferência", valorTotal: 120000, prazo: "30/03/2026", colaboradores: [2, 4], parcelas: [{ situacao: "PAGA", pagamento: "05/11/2025" }, { situacao: "PENDENTE", vencimento: "30/03/2026" }], timeline: [
    // Eventos da timeline mantêm as informações fornecidas no mock.
    { data: "10/11/2025", hora: "07:30", autor: "colaborador", tipo: "CONTRATACAO", visivel: true, descricao: "Instalação de andaimes suspensos e lavagem química de toda a superfície." },
    { data: "15/12/2025", hora: "12:00", autor: "colaborador", tipo: "ATUALIZACAO", visivel: true, descricao: "Substituição de pastilhas danificadas e impermeabilização da laje superior." },
    { data: "02/02/2026", hora: "16:25", autor: "colaborador", tipo: "FOTO", visivel: true, descricao: "Aplicação de textura acrílica hidro-repelente e fita LED decorativa." },
    { data: "28/02/2026", hora: "10:00", autor: "colaborador", tipo: "AGENDAMENTO", visivel: true, descricao: "Serviços físicos concluídos; vistoria final agendada com o síndico." },
    { data: "01/03/2026", hora: "10:30", autor: "colaborador", tipo: "STATUS", visivel: true, descricao: "Serviços físicos concluídos; obra aguardando conferência final do síndico." },
  ] },
  // Dados da quarta obra do exemplo.
  { titulo: "Espaço Gourmet e Área de Lazer Edifício Acácias", endereco: "Rua das Acácias, 45 - Ponta da Praia, Santos - SP", estado: "SP", cidade: "Santos", bairro: "Ponta da Praia", rua: "Rua das Acácias", numero: "45", semApartamento: true, semBloco: true, detalhes: "Construção de espaço gourmet, pergolado, churrasqueira e área de lazer, conforme medidas, materiais e acabamento estabelecidos no contrato.", status: "Concluída", valorTotal: 56000, prazo: "10/12/2025", colaboradores: [3, 4], parcelas: [{ situacao: "PAGA", pagamento: "15/09/2025" }, { situacao: "PAGA", pagamento: "10/12/2025" }], timeline: [
    // Eventos da timeline mantêm as informações fornecidas no mock.
    { data: "20/09/2025", hora: "08:15", autor: "colaborador", tipo: "CONTRATACAO", visivel: true, descricao: "Escavação e concretagem das bases estruturais para o pergolado." },
    { data: "15/10/2025", hora: "09:20", autor: "colaborador", tipo: "EQUIPE", visivel: false, descricao: "Equipe de carpintaria interna alocada para montagem do pergolado." },
    { data: "15/10/2025", hora: "11:00", autor: "colaborador", tipo: "ATUALIZACAO", visivel: true, descricao: "Montagem do pergolado em madeira nobre e instalação de vidro temperado." },
    { data: "12/11/2025", hora: "14:10", autor: "colaborador", tipo: "ATUALIZACAO", visivel: true, descricao: "Construção da churrasqueira pré-moldada e revestimento em pedra natural." },
    { data: "10/12/2025", hora: "16:45", autor: "admin", tipo: "STATUS", visivel: true, descricao: "Vistoria aprovada sem pendências, limpeza pós-obra e entrega das chaves ao cliente." },
  ] },
];
// Define cinco preços iniciais plausíveis para os serviços demonstrativos.
const PRECOS = [
  // Preço de alvenaria por metro quadrado.
  { servico: "Alvenaria de vedação", unidade: "m²", valor: 180 },
  // Preço de pintura por metro quadrado.
  { servico: "Pintura interna", unidade: "m²", valor: 45 },
  // Preço de instalação elétrica por ponto.
  { servico: "Instalação elétrica", unidade: "ponto", valor: 120 },
  // Preço de instalação hidráulica por ponto.
  { servico: "Instalação hidráulica", unidade: "ponto", valor: 150 },
  // Preço de assentamento de piso por metro quadrado.
  { servico: "Assentamento de piso", unidade: "m²", valor: 95 },
];
// Executa a carga de dados de demonstração.
async function main() {
  // Impede a criação ou atualização dos dados de demonstração em produção.
  if (process.env.NODE_ENV === "production") throw new Error("O seed de demonstração não pode ser executado em produção.");
  // Cria uma instância do cliente do banco de dados.
  const prisma = new PrismaClient();
  // Garante o encerramento da conexão mesmo se ocorrer um erro.
  try {
    // Procura a empresa pelo nome fixo para tornar execuções repetidas seguras.
    const empresaExistente = await prisma.empresa.findFirst({ where: { nome: "Empresa Demo" } });
    // Atualiza a empresa encontrada ou cria uma empresa nova com UUID válido.
    const empresa = empresaExistente ? await prisma.empresa.update({ where: { id: empresaExistente.id }, data: { nome: "Empresa Demo" } }) : await prisma.empresa.create({ data: { nome: "Empresa Demo" } });
    // Cria um hash para aplicar a mesma senha às contas de demonstração.
    const senhaHash = await bcrypt.hash(SENHA_DEMO, ROUNDS_BCRYPT);
    // Guarda os usuários criados para relacioná-los aos registros seguintes.
    const usuarios = {};
    // Cria ou atualiza cada conta pela chave de e-mail exclusiva.
    for (const conta of CONTAS_DEMO) {
      // Persiste os dados atuais da conta mantendo o identificador existente.
      usuarios[conta.email] = await prisma.usuario.upsert({ where: { email: conta.email }, update: { nome: conta.nome, tipo: conta.tipo, senhaHash, empresaId: empresa.id, telefone: conta.telefone }, create: { empresaId: empresa.id, nome: conta.nome, email: conta.email, senhaHash, tipo: conta.tipo, telefone: conta.telefone } });
      // Informa no terminal qual conta foi garantida.
      console.log(`Conta de demonstração garantida: ${conta.email} (${conta.tipo})`);
    }
    // Atalho para o usuário administrador, usado como autor de eventos administrativos.
    const admin = usuarios["admin@obramaster.demo"];
    // Atalho para o usuário cliente compartilhado pelas quatro obras.
    const cliente = usuarios["cliente@obramaster.demo"];
    // Atalho para o login do funcionário Carlos.
    const colaboradorUsuario = usuarios["colaborador@obramaster.demo"];
    // Cria ou atualiza o cadastro de Carlos e liga-o ao respectivo usuário.
    const funcionarioCarlos = await prisma.funcionario.upsert({ where: { usuarioId: colaboradorUsuario.id }, update: { empresaId: empresa.id, nome: "Carlos Eduardo da Silva", funcao: "Mestre de Obras", nivel: "RESPONSAVEL", telefone: "(11) 98765-4321", ativo: true }, create: { empresaId: empresa.id, nome: "Carlos Eduardo da Silva", funcao: "Mestre de Obras", nivel: "RESPONSAVEL", telefone: "(11) 98765-4321", usuarioId: colaboradorUsuario.id } });
    // Define os outros profissionais que aparecem na escala dos mocks.
    const equipe = [
      // Cadastro de Mariana conforme o mock.
      { idMock: 2, nome: "Mariana Souza Santos", funcao: "Engenheira Civil", telefone: "(11) 97654-3210", nivel: "RESPONSAVEL" },
      // Cadastro de Roberto conforme o mock.
      { idMock: 3, nome: "Roberto Lima Mendes", funcao: "Eletricista Chefe", telefone: "(11) 96543-2109", nivel: "APOIO" },
      // Cadastro de Patrícia conforme o mock.
      { idMock: 4, nome: "Patrícia Gomes Alves", funcao: "Técnica em Edificações", telefone: "(19) 95432-1098", nivel: "APOIO" },
    ];
    // Indexa os profissionais por seus identificadores numéricos do mock.
    const funcionarios = { 1: funcionarioCarlos };
    // Cria ou atualiza cada profissional sem associar um login inexistente.
    for (const pessoa of equipe) {
      // Busca pelo nome dentro da empresa para que a carga seja repetível.
      const existente = await prisma.funcionario.findFirst({ where: { empresaId: empresa.id, nome: pessoa.nome } });
      // Atualiza o cadastro existente ou cria o profissional pela primeira vez.
      funcionarios[pessoa.idMock] = existente ? await prisma.funcionario.update({ where: { id: existente.id }, data: { funcao: pessoa.funcao, telefone: pessoa.telefone, nivel: pessoa.nivel, ativo: true } }) : await prisma.funcionario.create({ data: { empresaId: empresa.id, nome: pessoa.nome, funcao: pessoa.funcao, telefone: pessoa.telefone, nivel: pessoa.nivel } });
    }
    // Processa todas as quatro obras e seus dados relacionados.
    for (const [indice, dados] of OBRAS.entries()) {
      // Converte o prazo fornecido no mock para uma data inequívoca.
      const prazoFinal = dataPtBR(dados.prazo);
      // Localiza a obra pelo nome dentro da empresa ou cria seu registro.
      const obraExistente = await prisma.obra.findFirst({ where: { empresaId: empresa.id, nome: dados.titulo } });
      // Salva os campos de negócio da obra mantendo sua identidade em reexecuções.
      const obra = obraExistente ? await prisma.obra.update({ where: { id: obraExistente.id }, data: { descricao: dados.detalhes, endereco: dados.rua, estado: dados.estado, cidade: dados.cidade, bairro: dados.bairro, numero: dados.numero, semApartamento: dados.semApartamento, semBloco: dados.semBloco, informacoesAdicionais: dados.detalhes, status: STATUS_OBRA[dados.status], valorTotal: dados.valorTotal, prazoFinal, clienteId: cliente.id } }) : await prisma.obra.create({ data: { empresaId: empresa.id, nome: dados.titulo, descricao: dados.detalhes, endereco: dados.rua, estado: dados.estado, cidade: dados.cidade, bairro: dados.bairro, numero: dados.numero, semApartamento: dados.semApartamento, semBloco: dados.semBloco, informacoesAdicionais: dados.detalhes, status: STATUS_OBRA[dados.status], valorTotal: dados.valorTotal, prazoFinal, clienteId: cliente.id } });
      // Cria cada uma das duas parcelas com metade do valor da obra.
      for (const parcela of dados.parcelas) {
        // Usa o número da parcela para impedir duplicatas em execuções futuras.
        await prisma.parcela.upsert({ where: { obraId_numero: { obraId: obra.id, numero: dados.parcelas.indexOf(parcela) + 1 } }, update: { valor: dados.valorTotal / 2, situacao: parcela.situacao, pagaEm: parcela.pagamento ? dataPtBR(parcela.pagamento) : null }, create: { obraId: obra.id, numero: dados.parcelas.indexOf(parcela) + 1, valor: dados.valorTotal / 2, situacao: parcela.situacao, pagaEm: parcela.pagamento ? dataPtBR(parcela.pagamento) : null } });
      }
      // Persiste cada evento da timeline com uma chave lógica verificável.
      for (const evento of dados.timeline) {
        // Seleciona o autor administrativo ou o colaborador conforme o mock.
        const autor = evento.autor === "admin" ? admin : colaboradorUsuario;
        // Procura evento equivalente por obra, data, tipo e descrição.
        const eventoExistente = await prisma.obraEvento.findFirst({ where: { obraId: obra.id, tipo: evento.tipo, descricao: evento.descricao } });
        // Atualiza evento encontrado ou cria um novo preservando sua data do mock.
        if (eventoExistente) await prisma.obraEvento.update({ where: { id: eventoExistente.id }, data: { empresaId: empresa.id, usuarioId: autor.id, visivelParaCliente: evento.visivel, criadoEm: dataPtBR(evento.data, evento.hora) } });
        // Cria o evento quando ainda não existe na timeline persistida.
        else await prisma.obraEvento.create({ data: { obraId: obra.id, empresaId: empresa.id, usuarioId: autor.id, tipo: evento.tipo, descricao: evento.descricao, visivelParaCliente: evento.visivel, criadoEm: dataPtBR(evento.data, evento.hora) } });
      }
      // Define a data inicial da escala com base na primeira atividade da timeline.
      const dataInicio = dataPtBR(dados.timeline[0].data, dados.timeline[0].hora);
      // Mantém a escala atual de cada profissional listado na obra.
      for (const idMock of dados.colaboradores) {
        // Procura escala aberta para a combinação da obra e do profissional.
        const escala = await prisma.obraEscala.findFirst({ where: { obraId: obra.id, funcionarioId: funcionarios[idMock].id, dataFim: null } });
        // Reutiliza uma escala aberta ou cria uma nova com a data do mock.
        if (!escala) await prisma.obraEscala.create({ data: { obraId: obra.id, funcionarioId: funcionarios[idMock].id, dataInicio, alteradoPorId: admin.id, motivo: "Escala atual reproduzida dos dados de demonstração." } });
      }
      // Mostra o título da obra concluída nesta etapa.
      console.log(`Obra de demonstração garantida: ${dados.titulo} (${indice + 1}/4)`);
    }
    // Lista os cinco serviços e seus valores iniciais por empresa.
    for (const preco of PRECOS) {
      // Procura o serviço pela combinação de empresa, nome e unidade.
      const existente = await prisma.tabelaPreco.findFirst({ where: { empresaId: empresa.id, servico: preco.servico, unidade: preco.unidade } });
      // Atualiza o preço encontrado ou cria um novo item na tabela.
      if (existente) await prisma.tabelaPreco.update({ where: { id: existente.id }, data: { valor: preco.valor, ativo: true } });
      // Cria o item quando ainda não há preço equivalente.
      else await prisma.tabelaPreco.create({ data: { empresaId: empresa.id, ...preco } });
    }
  // Garante que a conexão seja fechada ao terminar o seed.
  } finally {
    // Libera recursos do banco mesmo após falhas.
    await prisma.$disconnect();
  }
}
// Inicia a carga e registra falhas com código de saída diferente de zero.
main().catch((erro) => {
  // Exibe a mensagem para facilitar o diagnóstico.
  console.error("Falha ao criar os dados de demonstração:", erro.message);
  // Informa ao sistema operacional que o seed falhou.
  process.exitCode = 1;
});
