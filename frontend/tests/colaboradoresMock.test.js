// Usa o runner nativo de testes do Node.
import test from 'node:test'
// Usa asserções estritas para conferir os dados dos mocks.
import assert from 'node:assert/strict'
// Importa a lista mockada e a função que retorna obras alocadas.
import { colaboradoresMock, obterObrasDoColaborador } from '../src/data/colaboradoresMock.js'

// Mantém os dois novos gerentes nas listas sem lhes atribuir obra.
test('inclui Luciano e Jhonatan como Responsáveis sem obras alocadas', () => {
  // Busca os dois profissionais pelo identificador usado nos mocks.
  const luciano = colaboradoresMock.find((funcionario) => funcionario.id === 5)
  const jhonatan = colaboradoresMock.find((funcionario) => funcionario.id === 6)

  // Confere os dados profissionais de Luciano Oliveira.
  assert.deepEqual(
    { nome: luciano?.nome, funcao: luciano?.funcao, nivel: luciano?.nivel },
    { nome: 'Luciano Oliveira', funcao: 'Engenheiro', nivel: 'RESPONSAVEL' },
  )
  // Confere os dados profissionais de Jhonatan Bruno.
  assert.deepEqual(
    { nome: jhonatan?.nome, funcao: jhonatan?.funcao, nivel: jhonatan?.nivel },
    { nome: 'Jhonatan Bruno', funcao: 'Arquiteto', nivel: 'RESPONSAVEL' },
  )
  // Confirma que nenhum dos dois aparece na escala de uma obra mockada.
  assert.deepEqual(obterObrasDoColaborador(5), [])
  assert.deepEqual(obterObrasDoColaborador(6), [])
})
