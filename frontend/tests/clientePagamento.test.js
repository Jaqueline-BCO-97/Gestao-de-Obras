import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { obterChavePagamento, limparChavePagamento } from '../src/utils/idempotenciaPagamento.js'
import { retomarPagamento } from '../src/services/auth.js'

const pagina = await readFile(fileURLToPath(new URL('../src/pages/ClientePagamento.jsx', import.meta.url)), 'utf8')
const servico = await readFile(fileURLToPath(new URL('../src/services/auth.js', import.meta.url)), 'utf8')

test('pagamento consulta obra real e inicia checkout com parcela, valor e chave idempotente', () => {
  assert.match(pagina, /buscarObra\(id\)/)
  assert.match(pagina, /obterChavePagamento\(sessionStorage, dadosTentativa\)/)
  assert.match(pagina, /window\.location\.assign\(resposta\.checkoutUrl\)/)
  assert.match(pagina, /checkoutEmAndamento\.current/)
  assert.match(servico, /Idempotency-Key/)
  assert.match(servico, /Bearer \$\{token\}/)
})

test('falha recuperável conserva chave na sessão, outra parcela tem chave própria e erro definitivo inicia nova tentativa', () => {
  const itens = new Map()
  const armazenamento = { getItem: (chave) => itens.get(chave) || null, setItem: (chave, valor) => itens.set(chave, valor), removeItem: (chave) => itens.delete(chave) }
  let sequencia = 0
  const gerar = () => `id-${++sequencia}`
  const parcela1 = { obraId: 'obra-a', parcelaId: 'parcela-1', valor: 100 }
  const chaveInicial = obterChavePagamento(armazenamento, parcela1, gerar)
  assert.equal(obterChavePagamento(armazenamento, parcela1, gerar), chaveInicial)
  assert.notEqual(obterChavePagamento(armazenamento, { ...parcela1, parcelaId: 'parcela-2' }, gerar), chaveInicial)
  limparChavePagamento(armazenamento, parcela1)
  assert.notEqual(obterChavePagamento(armazenamento, parcela1, gerar), chaveInicial)
})

test('saldo mostrado usa saldo devedor persistido e identifica reserva sem abatê-la como pagamento', () => {
  assert.match(pagina, /parcela\.saldoDevedor/)
  assert.match(pagina, /parcela\.valorReservado/)
  assert.match(pagina, /parcela\.saldoDisponivel/)
  assert.match(pagina, /Saldo pendente:/)
})

test('retomada usa o ID persistido e funciona sem a chave no sessionStorage', async () => {
  const local = new Map([['token', 'jwt-cliente']])
  const temporaria = new Map()
  const armazenamento = (itens) => ({ getItem: (chave) => itens.get(chave) || null, setItem: (chave, valor) => itens.set(chave, valor), removeItem: (chave) => itens.delete(chave) })
  const requisicoes = []
  globalThis.localStorage = armazenamento(local)
  globalThis.sessionStorage = armazenamento(temporaria)
  globalThis.fetch = async (url, opcoes) => {
    requisicoes.push({ url, opcoes })
    return { ok: true, json: async () => ({ checkoutUrl: 'https://checkout.teste/original' }) }
  }
  try {
    const primeiraSessao = await retomarPagamento('obra-a', 'tentativa-123')
    globalThis.sessionStorage = armazenamento(new Map())
    const outraSessao = await retomarPagamento('obra-a', 'tentativa-123')
    assert.equal(primeiraSessao.checkoutUrl, 'https://checkout.teste/original')
    assert.equal(outraSessao.checkoutUrl, 'https://checkout.teste/original')
    assert.equal(requisicoes.length, 2)
    assert.ok(requisicoes.every(({ url }) => url.endsWith('/obras/obra-a/pagamentos/tentativa-123/retomar')))
    assert.ok(requisicoes.every(({ opcoes }) => opcoes.method === 'POST' && !opcoes.headers?.['Idempotency-Key']))
    assert.equal(temporaria.size, 0)
  } finally {
    delete globalThis.localStorage
    delete globalThis.sessionStorage
    delete globalThis.fetch
  }
})

test('retorno do checkout apenas consulta novamente e parcela dois fica bloqueada até conclusão', () => {
  assert.match(pagina, /collection_status/)
  assert.match(pagina, /não confirma pagamento/)
  assert.match(pagina, /parcela\.numero === 2 && !conclusaoConfirmada/)
  assert.doesNotMatch(pagina, /situacao\s*=\s*['"]paga/)
  assert.match(pagina, /setInterval\(consultar, 30000\)/)
  assert.match(pagina, /removeEventListener\('visibilitychange'/)
})
