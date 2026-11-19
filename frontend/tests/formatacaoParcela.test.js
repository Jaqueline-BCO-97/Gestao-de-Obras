import test from 'node:test'
import assert from 'node:assert/strict'
import { textoDataParcela } from '../src/utils/formatacaoParcela.js'

test('parcela paga mostra a data de pagamento disponível', () => {
  assert.equal(textoDataParcela({ situacao: 'paga', pagamento: '15/02/2026' }), 'Pago em: 15/02/2026')
})

test('parcela pendente mostra vencimento válido, sem inventar quando ausente ou inválido', () => {
  assert.equal(textoDataParcela({ situacao: 'pendente', vencimento: '30/02/2026' }), 'Data de vencimento não informada')
  assert.equal(textoDataParcela({ situacao: 'pendente', vencimento: null }), 'Data de vencimento não informada')
  assert.equal(textoDataParcela({ situacao: 'pendente', vencimento: '28/02/2026' }), 'Vencimento: 28/02/2026')
})

test('parcela paga sem data não imprime null', () => {
  assert.equal(textoDataParcela({ situacao: 'paga', pagamento: null }), 'Data de pagamento não informada')
})
