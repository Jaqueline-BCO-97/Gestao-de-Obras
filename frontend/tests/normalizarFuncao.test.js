// Usa o executor de testes nativo do Node para manter o projeto sem dependência nova.
import test from 'node:test'
// Usa asserções nativas para comparar os resultados da normalização.
import assert from 'node:assert/strict'
// Lê o componente para conferir os dados que aparecem nas opções de obra.
import { readFile } from 'node:fs/promises'
// Importa o helper que compara funções sem alterar os valores originais.
import { normalizarFuncaoComparacao } from '../src/utils/funcao.js'
// Importa o filtro das obras que podem ser atribuídas a um gerente.
import { filtrarObrasAtribuiveis } from '../src/utils/obrasAtribuiveis.js'

// Carrega a tela para verificar uso do serviço, busca e ausência de valores financeiros.
const codigoTelaGerentes = await readFile(new URL('../src/pages/AdminGerentes.jsx', import.meta.url), 'utf8')
// Carrega o combobox separado para conferir nome e status das opções do F4b.
const codigoComboboxObra = await readFile(new URL('../src/components/ComboboxObraAtribuicao.jsx', import.meta.url), 'utf8')
// Carrega a tela da obra para verificar a mesma comparação de função.
const codigoTelaObra = await readFile(new URL('../src/pages/AdminObra.jsx', import.meta.url), 'utf8')

// Compara acentos, espaços, caixa e funções diferentes com a regra aprovada.
test('normaliza funções sem modificar o texto salvo ou exibido', () => {
  // Mantém as palavras digitadas disponíveis para exibição sem normalização.
  const eletricistaDigitado = 'Eletricista'
  // Prepara a variação com acento e caixa diferentes.
  const eletricistaComAcento = 'eletricistá'
  // Prepara uma função com dois espaços internos.
  const mestreDigitado = 'Mestre  de obras'
  // Prepara a mesma função com um espaço e caixa baixa.
  const mestreNormalizado = 'mestre de obras'
  // Confirma que o frontend trata a variação de acento como função igual.
  assert.equal(normalizarFuncaoComparacao(eletricistaDigitado), normalizarFuncaoComparacao(eletricistaComAcento))
  // Confirma que o frontend junta espaços repetidos apenas na comparação.
  assert.equal(normalizarFuncaoComparacao(mestreDigitado), normalizarFuncaoComparacao(mestreNormalizado))
  // Confirma que funções distintas continuam sendo diferentes.
  assert.notEqual(normalizarFuncaoComparacao('Engenheiro'), normalizarFuncaoComparacao('Arquiteto'))
  // Confirma que o valor original mantém acento, caixa e espaços.
  assert.equal(mestreDigitado, 'Mestre  de obras')
  // Confirma que a tela de obra usa o comparador nos bloqueios visuais.
  assert.ok(codigoTelaObra.includes('normalizarFuncaoComparacao'))
})

// Filtra obras arquivadas, concluídas e já atribuídas, mantendo busca sem acentos.
test('lista só obras elegíveis, exclui concluídas e não repete obras já vinculadas', () => {
  // Monta obras com status permitidos e não permitidos.
  const obras = [
    { id: 'agendada', titulo: 'Área externa', status: 'Agendada', valorTotal: 15000 },
    { id: 'andamento', titulo: 'Cozinha', status: 'Em andamento', valorTotal: 20000 },
    { id: 'conferencia', titulo: 'Banheiro', status: 'Aguardando conferência', valorTotal: 10000 },
    { id: 'concluida', titulo: 'Pintura', status: 'Concluída', valorTotal: 5000 },
    { id: 'arquivada', titulo: 'Garagem', status: 'Agendada', excluidaEm: '2026-11-01', valorTotal: 7000 },
  ]
  // Registra uma obra que o gerente já acessa para não exibi-la novamente.
  const gerente = { escalas: [{ obra: { id: 'andamento' } }] }
  // Filtra a busca pela palavra area para confirmar que acentos e caixa são ignorados.
  const resultadoBusca = filtrarObrasAtribuiveis(obras, gerente, 'area')
  // Confirma que a obra Área externa aparece mesmo sem acento na busca.
  assert.deepEqual(resultadoBusca.map((obra) => obra.id), ['agendada'])
  // Lista todas as opções para confirmar os três status aceitos e os filtros restantes.
  const todasDisponiveis = filtrarObrasAtribuiveis(obras, gerente)
  // Confirma que a obra atual do gerente, a concluída e a arquivada foram excluídas.
  assert.deepEqual(todasDisponiveis.map((obra) => obra.id).sort(), ['agendada', 'conferencia'].sort())
  // Confirma que a tela exibe nome e status, sem renderizar campos financeiros.
  assert.ok(codigoComboboxObra.includes('{obra.titulo || obra.nome} · {obra.status}'))
  assert.equal(/obra\.valor(?:Total|Base)/.test(codigoTelaGerentes), false)
  // Confirma que a tela chama a operação existente de atribuição.
  assert.ok(codigoTelaGerentes.includes('alocarFuncionarioObra(obraId, funcionario.id)'))
  assert.ok(codigoTelaGerentes.includes('mensagemVaziaObrasAtribuicao'))
})

// Confirma que gerente sem obra recebe as opções permitidas e o botão de atribuição.
test('gerente sem obras pode abrir a lista de atribuição', () => {
  // Monta uma obra para cada status que a tela deve aceitar ou ocultar.
  const obras = [
    { id: 'agendada', titulo: 'Área externa', status: 'Agendada' },
    { id: 'andamento', titulo: 'Cozinha', status: 'Em andamento' },
    { id: 'conferencia', titulo: 'Banheiro', status: 'Aguardando conferência' },
    { id: 'concluida', titulo: 'Pintura', status: 'Concluída' },
  ]
  // Representa um gerente Responsável que ainda não tem nenhuma escala.
  const gerenteSemObras = { escalas: [] }
  // Filtra as obras permitidas sem remover opções por vínculo anterior.
  const disponiveis = filtrarObrasAtribuiveis(obras, gerenteSemObras)
  // Confirma que as três opções válidas ficam disponíveis para a atribuição.
  assert.deepEqual(disponiveis.map((obra) => obra.id), ['agendada', 'andamento', 'conferencia'])
  // Confirma que a tela mostra o estado sem obra e o botão correspondente.
  assert.ok(codigoTelaGerentes.includes('Sem obra atribuída atualmente.'))
  assert.ok(codigoTelaGerentes.includes('>Atribuir obra</Button>'))
})
