// Usa o executor integrado ao Node para cobrir a regra sem carregar o React.
import test from 'node:test'
// Usa asserções estritas para comparar os payloads e erros.
import assert from 'node:assert/strict'
// Importa as funções que preparam a escala no formulário.
import { prepararProgramacaoFuncionario, programacaoVazia, separarHorarioInicio } from '../src/utils/programacaoFuncionario.js'

// Confere a conversão de horário entre a API e os campos da tela.
test('separa HH:MM e preserva horário antigo ausente', () => {
  // Uma hora já salva aparece em seus dois campos.
  assert.deepEqual(separarHorarioInicio('07:05'), { hora: '07', minuto: '05' })
  // Um registro antigo sem horário permanece vazio.
  assert.deepEqual(separarHorarioInicio(null), { hora: '', minuto: '' })
  // Uma programação nova começa sem dias ou horário.
  assert.deepEqual(programacaoVazia(), { diasSemana: [], hora: '', minuto: '' })
})

// Confere a regra condicional de horário entre obras.
test('aceita dia em duas obras com horários diferentes e bloqueia horário igual', () => {
  // Horários distintos no mesmo dia podem ser enviados.
  const permitido = prepararProgramacaoFuncionario({
    'obra-a': { diasSemana: [1], hora: '07', minuto: '00' },
    'obra-b': { diasSemana: [1], hora: '08', minuto: '00' },
  })
  assert.equal(permitido.erro, '')
  assert.equal(permitido.disponibilidades[0].horarioInicio, '07:00')

  // O horário exato repetido no mesmo dia deve ser recusado na tela.
  const conflito = prepararProgramacaoFuncionario({
    'obra-a': { diasSemana: [1], hora: '07', minuto: '00' },
    'obra-b': { diasSemana: [1], hora: '07', minuto: '00' },
  })
  assert.match(conflito.erro, /mesmo dia e horário/i)
})

// Confere as mensagens de validação para horários incompletos.
test('exige horário em dias repetidos e rejeita campo parcial', () => {
  // Sem horário na segunda obra, o dia repetido fica inválido.
  const semHorario = prepararProgramacaoFuncionario({
    'obra-a': { diasSemana: [2], hora: '07', minuto: '00' },
    'obra-b': { diasSemana: [2], hora: '', minuto: '' },
  })
  assert.match(semHorario.erro, /Informe o horário de início/i)

  // Uma hora sem minuto é um preenchimento parcial.
  const parcial = prepararProgramacaoFuncionario({
    'obra-a': { diasSemana: [2], hora: '07', minuto: '' },
  })
  assert.match(parcial.erro, /hora e minuto juntos/i)
})
