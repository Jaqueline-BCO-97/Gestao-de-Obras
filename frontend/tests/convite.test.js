// Usa o executor de testes nativo do Node já adotado pelo frontend.
import test from 'node:test'
// Usa as verificações nativas para manter o teste sem dependências adicionais.
import assert from 'node:assert/strict'
// Importa a regra usada pelo formulário para validar a confirmação de senha.
import { senhasConferem } from '../src/utils/convite.js'

// Garante que uma confirmação diferente bloqueia o aceite do convite.
test('confirmação de senha só passa quando os valores são iguais', () => {
  // Senhas diferentes não podem ser aceitas pelo formulário.
  assert.equal(senhasConferem('Senha-1234', 'Senha-1235'), false)
  // Senhas idênticas permitem continuar para o envio ao backend.
  assert.equal(senhasConferem('Senha-1234', 'Senha-1234'), true)
})
