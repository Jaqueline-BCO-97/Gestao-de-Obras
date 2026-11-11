// Arquivo de dados fictícios (mock) para simular as obras do sistema
// Este arquivo é utilizado durante a fase de desenvolvimento antes da integração com o banco de dados

// Lista de obras mockadas contendo exatamente 4 obras, cada uma com um status diferente
export const obrasMock = [
  // Obra 1: Representa uma obra com status "Agendada"
  {
    // Identificador único da obra no sistema
    id: 1,
    // Título ou nome fantasia descritivo da obra
    titulo: 'Construção Residencial Alphaville',
    // Nome do cliente proprietário da obra
    cliente: 'Beatriz Silveira',
    // Lista de identificadores dos colaboradores alocados nesta obra
    colaboradores: [1, 2],
    // Endereço completo onde a obra será realizada
    endereco: 'Alameda dos Ipês, 120 - Residencial Alphaville, Barueri - SP',
    // Situação atual da obra no ciclo de vida da construção
    status: 'Agendada',
    // Valor total do contrato da obra em reais (formato numérico)
    valorTotal: 180000,
    // Primeira parcela representando exatamente 50% do valor total
    parcela1: {
      // Número sequencial da parcela
      numero: 1,
      // Valor da parcela em reais (50% de 180.000)
      valor: 90000,
      // Situação atual da parcela (paga ou pendente)
      situacao: 'pendente',
      // Data prevista para o vencimento desta parcela
      vencimento: '15/04/2026',
    },
    // Segunda parcela representando os 50% restantes
    parcela2: {
      // Número sequencial da parcela
      numero: 2,
      // Valor da parcela em reais (50% de 180.000)
      valor: 90000,
      // Situação atual da parcela (paga ou pendente)
      situacao: 'pendente',
      // Data prevista para o vencimento desta parcela
      vencimento: '15/08/2026',
    },
    // Prazo estimado para a conclusão total da obra
    prazo: '15/10/2026',
    // Lista de nomes fictícios de arquivos de fotos da obra
    fotos: [
      'planejamento_terreno.jpg',
      'estudo_topografico.jpg',
      'planta_baixa_aprovada.jpg',
      'maquete_3d_fachada.jpg',
    ],
    // Histórico de eventos e marcos cronológicos da obra
    timeline: [
      {
        // Data em que o evento ocorreu
        data: '05/03/2026',
        // Categoria ou tipo do marco registrado
        tipo: 'Contratação',
        // Explicação detalhada do que aconteceu neste evento
        descricao: 'Contrato de prestação de serviços assinado e projeto arquitetônico finalizado.',
      },
      {
        // Data em que o evento ocorreu
        data: '12/03/2026',
        // Categoria ou tipo do marco registrado
        tipo: 'Aprovação',
        // Explicação detalhada do que aconteceu neste evento
        descricao: 'Alvará de construção emitido e aprovado pela Prefeitura Municipal.',
      },
      {
        // Data em que o evento ocorreu
        data: '01/04/2026',
        // Categoria ou tipo do marco registrado
        tipo: 'Agendamento',
        // Explicação detalhada do que aconteceu neste evento
        descricao: 'Início da mobilização da equipe e maquinários agendado para meados de abril.',
      },
    ],
  },
  // Obra 2: Representa uma obra com status "Em andamento"
  {
    // Identificador único da obra
    id: 2,
    // Título da obra
    titulo: 'Reforma Completa de Apartamento Jardins',
    // Nome do cliente proprietário da obra
    cliente: 'Marcos Vinícius Prado',
    // Lista de identificadores dos colaboradores alocados nesta obra
    colaboradores: [1, 3],
    // Endereço do local da obra
    endereco: 'Rua Oscar Freire, 850 - Apto 71, Cerqueira César, São Paulo - SP',
    // Status indicando que os serviços estão sendo executados no momento
    status: 'Em andamento',
    // Valor total do contrato
    valorTotal: 75000,
    // Primeira parcela (50% do valor total)
    parcela1: {
      // Número da parcela
      numero: 1,
      // Valor da parcela (50% de 75.000)
      valor: 37500,
      // Situação quitada pelo cliente
      situacao: 'paga',
      // Data em que o pagamento foi realizado
      pagamento: '10/01/2026',
    },
    // Segunda parcela (50% restante do valor total)
    parcela2: {
      // Número da parcela
      numero: 2,
      // Valor da parcela (50% de 75.000)
      valor: 37500,
      // Situação ainda em aberto
      situacao: 'pendente',
      // Data prevista para cobrança final
      vencimento: '20/05/2026',
    },
    // Prazo final previsto para entrega da reforma
    prazo: '25/05/2026',
    // Lista de fotos fictícias do andamento da reforma
    fotos: [
      'demolicao_revestimentos.jpg',
      'reforco_estrutural_viga.jpg',
      'novas_tubulacoes_hidraulicas.jpg',
      'instalacao_conduites_eletricos.jpg',
    ],
    // Linha do tempo de execução da reforma
    timeline: [
      {
        // Data do evento
        data: '08/01/2026',
        // Tipo do marco
        tipo: 'Início',
        // Detalhes da etapa
        descricao: 'Demolição das paredes antigas e remoção de entulhos concluída.',
      },
      {
        // Data do evento
        data: '25/01/2026',
        // Tipo do marco
        tipo: 'Instalações',
        // Detalhes da etapa
        descricao: 'Nova rede hidráulica em PPR e fiação elétrica de alta potência instaladas.',
      },
      {
        // Data do evento
        data: '18/02/2026',
        // Tipo do marco
        tipo: 'Alvenaria',
        // Detalhes da etapa
        descricao: 'Construção de divisórias em drywall e nivelamento de contrapiso em execução.',
      },
    ],
  },
  // Obra 3: Representa uma obra com status "Aguardando conferência"
  {
    // Identificador único da obra
    id: 3,
    // Título da obra
    titulo: 'Modernização de Fachada Edifício Horizonte',
    // Nome do cliente proprietário da obra
    cliente: 'Condomínio Edifício Horizonte',
    // Lista de identificadores dos colaboradores alocados nesta obra
    colaboradores: [2, 4],
    // Endereço da obra
    endereco: 'Av. Atlântica, 2140 - Copacabana, Rio de Janeiro - RJ',
    // Status indicando que a obra física terminou e aguarda vistoria
    status: 'Aguardando conferência',
    // Valor total do contrato
    valorTotal: 120000,
    // Primeira parcela já paga na assinatura
    parcela1: {
      // Número da parcela
      numero: 1,
      // Valor da parcela (50% de 120.000)
      valor: 60000,
      // Situação quitada
      situacao: 'paga',
      // Data do pagamento
      pagamento: '05/11/2025',
    },
    // Segunda parcela a pagar após a conferência
    parcela2: {
      // Número da parcela
      numero: 2,
      // Valor da parcela (50% de 120.000)
      valor: 60000,
      // Situação pendente aguardando liberação pós vistoria
      situacao: 'pendente',
      // Data prevista
      vencimento: '30/03/2026',
    },
    // Prazo de entrega final
    prazo: '30/03/2026',
    // Lista de fotos fictícias da fachada
    fotos: [
      'restauracao_pastilhas.jpg',
      'impermeabilizacao_marquise.jpg',
      'pintura_texturizada_externa.jpg',
      'iluminacao_cenografica_led.jpg',
    ],
    // Linha do tempo dos trabalhos na fachada
    timeline: [
      {
        // Data do evento
        data: '10/11/2025',
        // Tipo do marco
        tipo: 'Início',
        // Detalhes da etapa
        descricao: 'Instalação de andaimes suspensos e lavagem química de toda a superfície.',
      },
      {
        // Data do evento
        data: '15/12/2025',
        // Tipo do marco
        tipo: 'Recuperação',
        // Detalhes da etapa
        descricao: 'Substituição de pastilhas danificadas e impermeabilização da laje superior.',
      },
      {
        // Data do evento
        data: '02/02/2026',
        // Tipo do marco
        tipo: 'Pintura',
        // Detalhes da etapa
        descricao: 'Aplicação de textura acrílica hidro-repelente e fita LED decorativa.',
      },
      {
        // Data do evento
        data: '28/02/2026',
        // Tipo do marco
        tipo: 'Vistoria',
        // Detalhes da etapa
        descricao: 'Serviços físicos concluídos; aguardando vistoria final e conferência do síndico.',
      },
    ],
  },
  // Obra 4: Representa uma obra com status "Concluída"
  {
    // Identificador único da obra
    id: 4,
    // Título da obra
    titulo: 'Espaço Gourmet e Área de Lazer Campinas',
    // Nome do cliente proprietário da obra
    cliente: 'Fernanda Cristina Rocha',
    // Lista de identificadores dos colaboradores alocados nesta obra
    colaboradores: [3, 4],
    // Endereço da obra
    endereco: 'Rua das Acácias, 45 - Parque Prado, Campinas - SP',
    // Status de obra 100% finalizada e entregue
    status: 'Concluída',
    // Valor total do contrato
    valorTotal: 56000,
    // Primeira parcela paga
    parcela1: {
      // Número da parcela
      numero: 1,
      // Valor da parcela (50% de 56.000)
      valor: 28000,
      // Situação quitada
      situacao: 'paga',
      // Data do pagamento
      pagamento: '15/09/2025',
    },
    // Segunda parcela também paga na entrega das chaves
    parcela2: {
      // Número da parcela
      numero: 2,
      // Valor da parcela (50% de 56.000)
      valor: 28000,
      // Situação quitada
      situacao: 'paga',
      // Data do pagamento
      pagamento: '10/12/2025',
    },
    // Prazo em que a obra foi concluída
    prazo: '10/12/2025',
    // Lista de fotos fictícias da obra finalizada
    fotos: [
      'estrutura_pergolado_madeira.jpg',
      'churrasqueira_revestimento_pedra.jpg',
      'bancada_porcelanato_esculpido.jpg',
      'espaco_gourmet_finalizado.jpg',
    ],
    // Linha do tempo completa do início até a entrega
    timeline: [
      {
        // Data do evento
        data: '20/09/2025',
        // Tipo do marco
        tipo: 'Fundação',
        // Detalhes da etapa
        descricao: 'Escavação e concretagem das bases estruturais para o pergolado.',
      },
      {
        // Data do evento
        data: '15/10/2025',
        // Tipo do marco
        tipo: 'Carpintaria',
        // Detalhes da etapa
        descricao: 'Montagem do pergolado em madeira nobre e instalação de vidro temperado.',
      },
      {
        // Data do evento
        data: '12/11/2025',
        // Tipo do marco
        tipo: 'Alvenaria',
        // Detalhes da etapa
        descricao: 'Construção da churrasqueira pré-moldada e revestimento em pedra natural.',
      },
      {
        // Data do evento
        data: '10/12/2025',
        // Tipo do marco
        tipo: 'Entrega',
        // Detalhes da etapa
        descricao: 'Vistoria aprovada sem pendências, limpeza pós-obra e entrega das chaves ao cliente.',
      },
    ],
  },
]

// Função auxiliar que formata um valor numérico para o padrão de moeda brasileiro (R$ 0,00)
export function formatarMoeda(valor) {
  // Retorna o valor formatado usando o internacionalizador padrão do navegador
  return new Intl.NumberFormat('pt-BR', {
    // Define o estilo de formatação como moeda monetária
    style: 'currency',
    // Define a moeda brasileira Real (BRL)
    currency: 'BRL',
  }).format(valor)
}

// Função auxiliar que retorna as classes Tailwind adequadas para colorir cada tipo de status
export function obterCoresStatus(status) {
  // Mapeamento de estilos visuais baseados no texto exato do status
  switch (status) {
    // Caso o status seja Agendada, usa tons de azul
    case 'Agendada':
      // Retorna classes com borda azul e badge azul claro
      return {
        // Classe de borda usada no topo do card
        borda: 'border-sky-500',
        // Classes de fundo, texto e borda do badge indicador
        badge: 'bg-sky-50 text-sky-700 border-sky-200',
        // Cor do ponto de indicador circular
        ponto: 'bg-sky-500',
      }
    // Caso o status seja Em andamento, usa tons de amarelo / âmbar
    case 'Em andamento':
      // Retorna classes com borda âmbar e badge âmbar claro
      return {
        // Classe de borda usada no topo do card
        borda: 'border-amber-500',
        // Classes de fundo, texto e borda do badge indicador
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        // Cor do ponto de indicador circular
        ponto: 'bg-amber-500',
      }
    // Caso o status seja Aguardando conferência, usa tons de roxo
    case 'Aguardando conferência':
      // Retorna classes com borda roxa e badge roxo claro
      return {
        // Classe de borda usada no topo do card
        borda: 'border-purple-500',
        // Classes de fundo, texto e borda do badge indicador
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
        // Cor do ponto de indicador circular
        ponto: 'bg-purple-500',
      }
    // Caso o status seja Concluída, usa tons de verde / esmeralda
    case 'Concluída':
      // Retorna classes com borda esmeralda e badge esmeralda claro
      return {
        // Classe de borda usada no topo do card
        borda: 'border-emerald-500',
        // Classes de fundo, texto e borda do badge indicador
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        // Cor do ponto de indicador circular
        ponto: 'bg-emerald-500',
      }
    // Caso seja algum status inesperado, usa tons neutros de cinza
    default:
      // Retorna cores padrão cinza
      return {
        // Borda neutra
        borda: 'border-slate-400',
        // Badge neutro
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
        // Ponto neutro
        ponto: 'bg-slate-400',
      }
  }
}

// Exporta também a lista de obras como exportação padrão para facilitar a importação
export default obrasMock
