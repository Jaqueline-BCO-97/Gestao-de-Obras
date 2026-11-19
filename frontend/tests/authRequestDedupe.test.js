import test from 'node:test'
import assert from 'node:assert/strict'
import { consultarConvite } from '../src/services/auth.js'

test('requisições GET idênticas em andamento compartilham uma chamada de rede', async () => {
  const fetchAnterior = globalThis.fetch
  let chamadas = 0
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
    assert.equal(chamadas, 2, 'uma nova consulta após a anterior terminar deve atualizar os dados')
  } finally {
    globalThis.fetch = fetchAnterior
  }
})
