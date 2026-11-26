// Usa o executor de testes integrado ao Node, sem dependências adicionais.
import test from 'node:test'
// Usa as verificações estritas do Node para validar resultados exatos.
import assert from 'node:assert/strict'
// Importa as funções de busca que serão usadas pelas telas.
import { normalizarTextoBusca, textoCorrespondeBusca } from '../src/utils/buscaTexto.js'

// Garante que letras com acento possam ser encontradas sem acento.
test('busca por texto ignora acentos e maiúsculas', () => {
  // Confere o caso informado: "area" deve localizar "Área".
  assert.equal(textoCorrespondeBusca('Área de lazer', 'area'), true)
  // Confere que a caixa também não altera o resultado.
  assert.equal(textoCorrespondeBusca('OBRA CENTRAL', 'obra'), true)
  // Confere que consultas vazias continuam encontrando qualquer texto.
  assert.equal(textoCorrespondeBusca('Área', '  '), true)
  // Confere o texto normalizado usado pela busca.
  assert.equal(normalizarTextoBusca('São João'), 'sao joao')
})
