// Importa o runner de testes nativo do Node e as asserções estritas.
import test from 'node:test'
import assert from 'node:assert/strict'
// Importa o formatador puro usado para remover estado de interface do cadastro.
import { montarPayloadCadastroEmpresa } from '../src/utils/cadastroEmpresa.js'
// Importa o texto compartilhado pelos tooltips de CPF e CNPJ.
import { TEXTO_TOOLTIP_DOCUMENTO } from '../src/utils/documento.js'

// Garante que "Sem complemento" não seja enviada como campo persistente.
test('limpa e omite a flag de interface quando a empresa não tem complemento', () => {
  // Monta um cadastro com a caixa temporária marcada e texto anterior no complemento.
  const payload = montarPayloadCadastroEmpresa({ empresa: 'Obra Master', semComplemento: true, complemento: 'fundos' })
  // Confirma que a API recebe somente os campos persistíveis e o complemento vazio.
  assert.deepEqual(payload, { empresa: 'Obra Master', complemento: '' })
})

// Garante que o texto de orientação seja idêntico nos campos de CPF e CNPJ.
test('usa a orientação aprovada para CPF e CNPJ', () => {
  // Mantém a redação solicitada para todos os campos editáveis de documento.
  assert.equal(TEXTO_TOOLTIP_DOCUMENTO, 'digite só números, sem pontos, traços ou barra')
})
