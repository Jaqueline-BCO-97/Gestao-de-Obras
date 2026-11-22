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
