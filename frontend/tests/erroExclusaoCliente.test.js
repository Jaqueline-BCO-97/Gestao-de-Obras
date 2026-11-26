// Usa o executor nativo do Node para validar a regra de nova tentativa.
import { describe, it } from 'node:test'
// Compara os resultados esperados sem iniciar interface gráfica.
import assert from 'node:assert/strict'
// Importa a regra usada pelo botão da tela de clientes.
import { deveOferecerNovaTentativaExclusaoCliente } from '../src/utils/erroExclusaoCliente.js'

// Confere quando a tela deve ou não exibir o botão de tentar novamente.
describe('nova tentativa ao excluir cliente', () => {
  // Permite nova tentativa quando a conexão não respondeu.
  it('permite repetir falha de rede', () => {
    assert.equal(deveOferecerNovaTentativaExclusaoCliente({ status: 0 }), true)
  })

  // Permite nova tentativa quando o servidor apresentou falha técnica.
  it('permite repetir erro do servidor', () => {
    assert.equal(deveOferecerNovaTentativaExclusaoCliente({ status: 503 }), true)
  })

  // Permite nova tentativa quando o backend sinaliza conflito concorrente.
  it('permite repetir conflito durante a exclusão', () => {
    assert.equal(deveOferecerNovaTentativaExclusaoCliente({ status: 409, codigo: 'CLIENTE_EXCLUSAO_CONCORRENTE' }), true)
  })

  // Não oferece nova tentativa quando a regra bloqueia por negócio.
  it('não permite repetir bloqueio por pagamento realizado', () => {
    assert.equal(deveOferecerNovaTentativaExclusaoCliente({ status: 409, codigo: 'PAGAMENTO_REALIZADO' }), false)
  })
})
