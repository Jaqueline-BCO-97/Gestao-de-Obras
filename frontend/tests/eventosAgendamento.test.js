import test from 'node:test'
import assert from 'node:assert/strict'
import { consultaAindaPertenceAObra, criarRastreadorObra, detectarNovosAgendamentos, registrarEventosConhecidos, registrarListenerOnline } from '../src/utils/eventosAgendamento.js'

test('eventos antigos conhecidos não geram aviso inicial', () => {
  const ids = new Set()
  registrarEventosConhecidos([{ id: 'antigo', tipo: 'agendamento' }], ids)
  assert.deepEqual(detectarNovosAgendamentos([{ id: 'antigo', tipo: 'agendamento', visivelParaCliente: true }], ids), [])
})

test('novo reagendamento visível é detectado uma vez e eventos ocultos são ignorados', () => {
  const ids = new Set(['já-visto'])
  const eventos = [
    { id: 'novo', tipo: 'agendamento', visivelParaCliente: true, descricao: 'Nova data' },
    { id: 'oculto', tipo: 'agendamento', visivelParaCliente: false },
    { id: 'status', tipo: 'status', visivelParaCliente: true },
  ]
  assert.deepEqual(detectarNovosAgendamentos(eventos, ids), [eventos[0]])
  assert.deepEqual(detectarNovosAgendamentos(eventos, ids), [])
})

test('trocar de obra cria um rastreador vazio e rejeita resposta atrasada', () => {
  const obraAnterior = criarRastreadorObra('obra-anterior')
  registrarEventosConhecidos([{ id: 'evento-antigo', tipo: 'agendamento' }], obraAnterior.idsConhecidos)

  const novaObra = criarRastreadorObra('obra-nova')
  assert.notEqual(novaObra.idsConhecidos, obraAnterior.idsConhecidos)
  assert.equal(novaObra.idsConhecidos.size, 0)
  assert.equal(novaObra.primeiraLeitura, true)
  assert.equal(consultaAindaPertenceAObra(obraAnterior, 'obra-nova'), false)
  assert.equal(consultaAindaPertenceAObra(novaObra, 'obra-nova'), true)
  assert.equal(consultaAindaPertenceAObra(novaObra, 'obra-nova', false), false)
})

test('reconexão consulta imediatamente só com aba visível e cleanup remove listener', () => {
  const listeners = new Map()
  const janela = {
    addEventListener: (nome, fn) => listeners.set(nome, fn),
    removeEventListener: (nome, fn) => { if (listeners.get(nome) === fn) listeners.delete(nome) },
  }
  const documento = { visibilityState: 'hidden' }
  let consultas = 0
  const remover = registrarListenerOnline(() => { consultas += 1 }, janela, documento)

  listeners.get('online')()
  assert.equal(consultas, 0)
  documento.visibilityState = 'visible'
  listeners.get('online')()
  assert.equal(consultas, 1)
  remover()
  assert.equal(listeners.has('online'), false)
})
