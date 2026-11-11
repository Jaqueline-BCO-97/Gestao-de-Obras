// Arquivo de dados simulados (mock) contendo a lista de colaboradores da empresa
// Usado temporariamente na interface antes da integração definitiva com o banco de dados

// Lista de colaboradores fictícios cadastrados no sistema
export const colaboradoresMock = [
  // Colaborador 1: Mestre de obras responsável pela coordenação direta no canteiro
  {
    // Identificador numérico exclusivo do primeiro colaborador
    id: 1,
    // Nome completo do profissional
    nome: 'Carlos Eduardo da Silva',
    // Cargo ou especialidade do colaborador
    funcao: 'Mestre de Obras',
    // Telefone celular formatado para contato
    telefone: '(11) 98765-4321',
    // Lista de identificadores das obras em que o colaborador está alocado
    obrasAtribuidas: [1, 2],
  },
  // Colaborador 2: Engenheira civil responsável pelo acompanhamento técnico
  {
    // Identificador numérico exclusivo da segunda colaboradora
    id: 2,
    // Nome completo da profissional
    nome: 'Mariana Souza Santos',
    // Cargo ou especialidade técnica
    funcao: 'Engenheira Civil',
    // Telefone celular formatado para contato
    telefone: '(11) 97654-3210',
    // Lista de identificadores das obras atribuídas a ela
    obrasAtribuidas: [1, 3],
  },
  // Colaborador 3: Eletricista chefe responsável pelas instalações prediais
  {
    // Identificador numérico exclusivo do terceiro colaborador
    id: 3,
    // Nome completo do profissional
    nome: 'Roberto Lima Mendes',
    // Cargo ou especialidade técnica
    funcao: 'Eletricista Chefe',
    // Telefone celular formatado para contato
    telefone: '(11) 96543-2109',
    // Lista de identificadores das obras atribuídas a ele
    obrasAtribuidas: [2, 4],
  },
  // Colaborador 4: Técnica em edificações especialista em acabamentos e conferência
  {
    // Identificador numérico exclusivo da quarta colaboradora
    id: 4,
    // Nome completo da profissional
    nome: 'Patrícia Gomes Alves',
    // Cargo ou especialidade técnica
    funcao: 'Técnica em Edificações',
    // Telefone celular formatado para contato
    telefone: '(19) 95432-1098',
    // Lista de identificadores das obras atribuídas a ela
    obrasAtribuidas: [3, 4],
  },
]

// Exportação padrão do array de colaboradores para permitir diferentes estilos de importação
export default colaboradoresMock
