// Reutiliza a busca do Lote D para ignorar acentos e maiúsculas.
import { textoCorrespondeBusca } from './buscaTexto.js'
// Define os status não arquivados que podem aparecer no seletor de atribuição.
const STATUS_ATRIBUIVEIS = new Set(['Agendada', 'Em andamento', 'Aguardando conferência'])

// Filtra obras que podem ser atribuídas ao gerente sem repetir vínculos ativos.
export function filtrarObrasAtribuiveis(obras, funcionario, busca = '') {
  // Lê escalas ativas disponíveis no perfil do funcionário.
  const escalas = Array.isArray(funcionario?.escalas) ? funcionario.escalas : []
  // Guarda os IDs das obras que o gerente já tem para evitar mostrar duplicatas.
  const obrasVinculadas = new Set(escalas.map((escala) => escala.obra?.id).filter(Boolean))
  // Trata uma resposta inesperada da API como lista vazia.
  const listaObras = Array.isArray(obras) ? obras : []
  // Mantém apenas obras não arquivadas, em status aceito, sem vínculo e que casam com a busca.
  return listaObras.filter((obra) => !obra?.excluidaEm
    && STATUS_ATRIBUIVEIS.has(obra?.status)
    && !obrasVinculadas.has(obra?.id)
    && textoCorrespondeBusca(obra?.titulo || obra?.nome, busca))
}
