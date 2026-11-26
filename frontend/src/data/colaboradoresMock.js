// Arquivo de dados simulados (mock) contendo a lista de colaboradores da empresa
// Usado temporariamente na interface antes da integração definitiva com o banco de dados

// Importa a lista de obras, que é a fonte única dos colaboradores escalados em cada obra
import { obrasMock } from './obrasMock.js'

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
  },
  // Colaborador 5: gerente de demonstração sem obras nem dias programados
  {
    // Identificador numérico exclusivo de Luciano Oliveira
    id: 5,
    // Nome completo do profissional responsável
    nome: 'Luciano Oliveira',
    // Função profissional informada para a conta demo
    funcao: 'Engenheiro',
    // Registra o nível Responsável usado pela regra de alocação
    nivel: 'RESPONSAVEL',
    // Mantém o telefone vazio porque não foi definido para a demonstração
    telefone: '',
  },
  // Colaborador 6: gerente de demonstração sem obras nem dias programados
  {
    // Identificador numérico exclusivo de Jhonatan Bruno
    id: 6,
    // Nome completo do profissional responsável
    nome: 'Jhonatan Bruno',
    // Função profissional informada para a conta demo
    funcao: 'Arquiteto',
    // Registra o nível Responsável usado pela regra de alocação
    nivel: 'RESPONSAVEL',
    // Mantém o telefone vazio porque não foi definido para a demonstração
    telefone: '',
  },
]

// Devolve as obras que incluem o identificador do colaborador na escala
export function obterObrasDoColaborador(idColaborador) {
  // Mantém somente as obras cuja lista de colaboradores contém o identificador informado
  return obrasMock.filter((obra) => obra.colaboradores?.includes(idColaborador))
}

// Devolve os colaboradores escalados para a obra recebida
export function obterColaboradoresDaObra(obra) {
  // Lê os identificadores da obra, ou usa uma lista vazia se ela não tiver escala
  const idsColaboradores = obra?.colaboradores || []
  // Mantém somente os colaboradores cujos identificadores aparecem na lista da obra
  return colaboradoresMock.filter((colaborador) => idsColaboradores.includes(colaborador.id))
}

// Exportação padrão do array de colaboradores para permitir diferentes estilos de importação
export default colaboradoresMock
