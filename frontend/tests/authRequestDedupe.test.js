import test from 'node:test'
import assert from 'node:assert/strict'
import { aceitarConvite, consultarConvite } from '../src/services/auth.js'

test('GETs simultâneos e recentes compartilham a leitura e mutações invalidam o cache', async () => {
  const fetchAnterior = globalThis.fetch
  const localStorageAnterior = globalThis.localStorage
  const sessionStorageAnterior = globalThis.sessionStorage
  let chamadas = 0
  globalThis.localStorage = { getItem: () => null, removeItem: () => {} }
  globalThis.sessionStorage = { getItem: () => null, removeItem: () => {} }
  globalThis.fetch = async () => {
    chamadas += 1
    await new Promise((resolver) => setTimeout(resolver, 15))
    return { ok: true, json: async () => ({ obra: 'Obra demo' }) }
  }

  try {
    const respostas = await Promise.all([consultarConvite('token-demo'), consultarConvite('token-demo')])
    assert.equal(chamadas, 1)
    assert.deepEqual(respostas, [{ obra: 'Obra demo' }, { obra: 'Obra demo' }])
    await consultarConvite('token-demo')
    assert.equal(chamadas, 1, 'a tela pode reutilizar a resposta recente ao trocar de rota')
    await aceitarConvite('token-demo', 'Senha-demo-123')
    assert.equal(chamadas, 2)
    await consultarConvite('token-demo')
    assert.equal(chamadas, 3, 'uma mutação invalida as leituras armazenadas')
  } finally {
    globalThis.fetch = fetchAnterior
    globalThis.localStorage = localStorageAnterior
    globalThis.sessionStorage = sessionStorageAnterior
  }
})

// Confirma que o serviço preserva o código específico usado pela tela de aceite.
test('aceite preserva o código de e-mail divergente retornado pela API', async () => {
  // Guarda as funções globais para restaurá-las ao final do teste.
  const fetchAnterior = globalThis.fetch
  // Guarda o armazenamento local que contém o token persistente.
  const localStorageAnterior = globalThis.localStorage
  // Guarda o armazenamento de sessão que contém o token temporário.
  const sessionStorageAnterior = globalThis.sessionStorage
  // Guarda o payload enviado para verificar que o serviço inclui a confirmação digitada.
  let corpoEnviado
  // Simula uma navegação sem sessão para testar o aceite anônimo de cliente.
  globalThis.localStorage = { getItem: () => null, removeItem: () => {} }
  // Simula um armazenamento de sessão vazio.
  globalThis.sessionStorage = { getItem: () => null, removeItem: () => {} }
  // Simula a resposta 400 com o código funcional do e-mail divergente.
  globalThis.fetch = async (_url, opcoes) => {
    // Registra o corpo para confirmar que o e-mail digitado foi enviado.
    corpoEnviado = JSON.parse(opcoes.body)
    // Devolve o erro genérico do backend sem incluir o endereço verdadeiro.
    return { ok: false, status: 400, json: async () => ({ codigo: 'EMAIL_CONVITE_DIVERGENTE', erro: 'O e-mail informado não confere com o do convite. Confira o endereço e tente novamente.' }) }
  }

  try {
    // Confirma que a rejeição preserva status, código e mensagem do endpoint.
    await assert.rejects(aceitarConvite('token-email', 'Demo@12345', 'outro@teste.local'), (falha) => {
      // Confirma o status HTTP 400.
      assert.equal(falha.status, 400)
      // Confirma o código usado para apontar o erro no campo de e-mail.
      assert.equal(falha.codigo, 'EMAIL_CONVITE_DIVERGENTE')
      // Confirma que a mensagem não contém o e-mail verdadeiro do convite.
      assert.equal(falha.message.includes('cliente@teste.local'), false)
      // Indica que todas as verificações da rejeição foram satisfeitas.
      return true
    })
    // Confirma que o serviço enviou os dados digitados no formulário.
    assert.deepEqual(corpoEnviado, { senha: 'Demo@12345', email: 'outro@teste.local' })
  } finally {
    // Restaura o fetch original para não interferir nos demais testes.
    globalThis.fetch = fetchAnterior
    // Restaura o armazenamento local original.
    globalThis.localStorage = localStorageAnterior
    // Restaura o armazenamento de sessão original.
    globalThis.sessionStorage = sessionStorageAnterior
  }
})
