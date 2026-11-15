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

// Define os relacionamentos necessários para formar a resposta do frontend.
function incluirDadosDaObra(empresaId) {
  return {
    // Busca os dados do cliente relacionado à obra.
    cliente: { select: { id: true, nome: true, empresaId: true } },
    // Busca as parcelas na ordem em que devem aparecer.
    parcelas: { orderBy: { numero: "asc" } },
    // Busca eventos e autores da mesma empresa da obra.
    eventos: {
      where: { empresaId, usuario: { empresaId } },
      include: { usuario: { select: { nome: true } } },
      orderBy: { criadoEm: "asc" },
    },
    // Busca escalas abertas e funcionários da mesma empresa da obra.
    escalas: {
      where: { dataFim: null, funcionario: { empresaId } },
      include: { funcionario: { select: { id: true, nome: true } } },
    },
  };
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
  const resposta = { numero: parcela.numero, valor: Number(parcela.valor), situacao: parcela.situacao === "PAGA" ? "paga" : "pendente" };
  // Inclui a data do pagamento quando a parcela foi quitada.
  if (parcela.pagaEm) resposta.pagamento = formatarData(parcela.pagaEm);
  // Informa vencimento nulo porque o banco não possui esse campo no schema atual.
  else resposta.vencimento = null;
  // Devolve a parcela no formato usado pelo mock.
  return resposta;
}

// Oculta valores em reais nas descrições enviadas a colaboradores.
function ocultarValoresFinanceiros(descricao) {
  return descricao.replace(/R\$\s?\d[\d.,]*/gi, "[valor oculto]");
}

// Converte uma obra com relações para os nomes de campo usados no mock.
function formatarObra(obra, tipo) {
  // Ordena as parcelas já consultadas pelo número sequencial.
  const parcelas = [...obra.parcelas].sort((a, b) => a.numero - b.numero);
  // Prepara os campos gerais da resposta da obra.
  const resposta = {
    // Preserva o identificador da obra no banco.
    id: obra.id,
    // Renomeia o nome armazenado para o título do mock.
    titulo: obra.nome,
    // Inclui o nome do cliente ou nulo se não houver associação.
    cliente: obra.cliente?.empresaId === obra.empresaId ? obra.cliente.nome : null,
    // Apresenta os nomes dos funcionários atualmente escalados.
    colaboradores: obra.escalas.map((escala) => escala.funcionario.id),
    // Preserva o endereço cadastrado.
    endereco: obra.endereco,
    // Converte o estado para uma descrição legível.
    status: formatarStatus(obra.status),
    // Converte o prazo para o padrão de data do mock.
    prazo: formatarData(obra.prazoFinal),
    // Adapta os eventos ao formato da linha do tempo do mock.
    timeline: obra.eventos.filter((evento) => tipo === "CLIENTE" ? evento.visivelParaCliente : tipo === "COLABORADOR" ? !["PAGAMENTO", "ORCAMENTO_APROVADO", "CONTRATACAO"].includes(evento.tipo) : true).map((evento) => ({ id: evento.id, data: formatarData(evento.criadoEm), hora: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(evento.criadoEm), autor: evento.usuario.nome, tipo: evento.tipo.toLowerCase(), descricao: tipo === "COLABORADOR" ? ocultarValoresFinanceiros(evento.descricao) : evento.descricao, visivelParaCliente: evento.visivelParaCliente })),
  };
  // Inclui dados financeiros apenas para clientes e administradores.
  if (tipo !== "COLABORADOR") {
    // Converte o valor Decimal para número compatível com JSON.
    resposta.valorTotal = Number(obra.valorTotal);
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
  const where = { empresaId };
  // Limita clientes às obras ligadas ao próprio usuário.
  if (tipo === "CLIENTE") where.clienteId = usuarioId;
  // Limita colaboradores às obras com escala aberta para seu funcionário.
  if (tipo === "COLABORADOR") where.escalas = { some: { dataFim: null, funcionario: { usuarioId, empresaId } } };
  // Consulta as obras e suas relações para montar a resposta completa.
  const obras = await getPrisma().obra.findMany({ where, include: incluirDadosDaObra(empresaId), orderBy: { criadoEm: "desc" } });
  // Devolve cada obra no formato do frontend e com a timeline filtrada.
  return obras.map((obra) => formatarObra(obra, tipo));
}

// Busca uma obra somente dentro da empresa do token.
async function buscarObraPorId(id, empresaId, usuarioId, tipo) {
  // Confirma que o banco pode receber consultas.
  exigirBancoConfigurado();
  // Começa o filtro pelo identificador da obra e da empresa.
  const where = { id, empresaId };
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
async function criarObra({ empresaId, nome, descricao, endereco }) {
  // Confirma que o banco pode receber gravações.
  exigirBancoConfigurado();
  // Insere a obra sem alterar o contrato existente da rota POST.
  return getPrisma().obra.create({ data: { empresaId, nome, descricao, endereco } });
}

// Exporta as funções usadas pelas rotas do servidor.
module.exports = { listarObras, buscarObraPorId, criarObra };
