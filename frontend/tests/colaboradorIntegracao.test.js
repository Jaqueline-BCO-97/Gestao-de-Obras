import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { registrarAndamentoObra } from '../src/services/auth.js'

const armazenamentoOriginal = globalThis.localStorage
const sessaoOriginal = globalThis.sessionStorage
const fetchOriginal = globalThis.fetch
let requisicaoCapturada

before(() => {
  globalThis.localStorage = { getItem: (chave) => chave === 'token' ? 'jwt-teste' : null, removeItem() {}, setItem() {} }
  globalThis.sessionStorage = { getItem: () => null, removeItem() {}, setItem() {} }
  globalThis.fetch = async (url, opcoes) => {
    requisicaoCapturada = { url, opcoes }
    return { ok: true, status: 201, json: async () => ({ evento: { id: 'evento-persistido' } }) }
  }
})

after(() => {
  globalThis.localStorage = armazenamentoOriginal
  globalThis.sessionStorage = sessaoOriginal
  globalThis.fetch = fetchOriginal
})

describe('integração textual do colaborador', () => {
  it('envia descrição e tipo em JSON autenticado para a obra selecionada', async () => {
    const resposta = await registrarAndamentoObra('obra/123', 'Alvenaria concluída', 'ATUALIZACAO')
    assert.equal(resposta.evento.id, 'evento-persistido')
    assert.match(requisicaoCapturada.url, /\/obras\/obra%2F123\/andamento$/)
    assert.equal(requisicaoCapturada.opcoes.method, 'POST')
    assert.equal(requisicaoCapturada.opcoes.headers.Authorization, 'Bearer jwt-teste')
    assert.deepEqual(JSON.parse(requisicaoCapturada.opcoes.body), {
      descricao: 'Alvenaria concluída',
      tipo: 'ATUALIZACAO',
    })
  })

  it('preserva o erro HTTP sem converter falha em resposta de sucesso', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => ({ erro: 'Indisponível' }) })
    await assert.rejects(registrarAndamentoObra('obra-1', 'Nota', 'ANOTACAO'), (erro) => {
      assert.equal(erro.status, 503)
      assert.equal(erro.message, 'Indisponível')
      return true
    })
  })

  it('usa API real nas telas e não mantém mock, ID fixo ou fluxo fictício de foto', async () => {
    const dashboard = await readFile(new URL('../src/pages/Colaborador.jsx', import.meta.url), 'utf8')
    const detalhes = await readFile(new URL('../src/pages/ColaboradorObra.jsx', import.meta.url), 'utf8')
    assert.match(dashboard, /listarObras\(\)/)
    assert.doesNotMatch(dashboard, /colaboradoresMock|obrasMock|idColaboradorLogado|Carlos Eduardo/)
    assert.match(detalhes, /buscarObra\(id\)/)
    assert.match(detalhes, /registrarAndamentoObra\(id, descricao, tipoRegistro\)/)
    assert.match(detalhes, /envioAtivo\.current/)
    assert.match(detalhes, /<HistoricoObra eventos=\{obra\.timeline/)
    assert.doesNotMatch(detalhes, /colaboradoresMock|obrasMock|URL\.createObjectURL|type="file"|fotoUrl|multipart/i)
  })
})
