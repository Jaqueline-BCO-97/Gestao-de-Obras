// Importa o runner de testes nativo do Node e as asserções estritas.
import test from 'node:test'
import assert from 'node:assert/strict'
// Importa os utilitários de formatação do resumo de parcelas.
import { montarResumoParcelas, removerParentesesResumo } from '../src/utils/resumoParcelas.js'

// Cria um vetor de N parcelas com eventual diferença de centavos na última parcela.
function criarParcelas(quantidade, valorPadrao, valorUltima = valorPadrao, pagasAte = 0, atrasadaNumero = null) {
  return Array.from({ length: quantidade }, (_, indice) => {
    const numero = indice + 1
    const ehPaga = numero <= pagasAte
    return {
      numero,
      valor: numero === quantidade ? valorUltima : valorPadrao,
      situacao: ehPaga ? 'paga' : numero === atrasadaNumero ? 'atrasada' : 'pendente',
    }
  })
}

// Garante o texto quando nenhuma parcela foi paga ainda.
test('exibe cabeçalho de todas pendentes quando nenhuma parcela foi paga', () => {
  const resumo = montarResumoParcelas({ parcelas: criarParcelas(12, 1000) }, { origem: 'parcelas' })
  assert.match(resumo.cabecalho, /^12 parcelas de R\$\s*1\.000,00 — ainda pendentes$/)
  assert.equal(resumo.linhas.length, 0)
  assert.equal(resumo.cabecalho.includes('('), false)
})

// Garante avanço progressivo: sempre última paga e próxima não paga (inclusive atrasada).
test('exibe sempre duas linhas avançando os números conforme o pagamento e destaca atraso', () => {
  // 1ª paga, 2ª pendente.
  const passo1 = montarResumoParcelas({ parcelas: criarParcelas(12, 1000, 1000, 1) }, { origem: 'parcelas' })
  assert.match(passo1.cabecalho, /^12 parcelas de R\$\s*1\.000,00$/)
  assert.equal(passo1.linhas.length, 2)
  assert.match(passo1.linhas[0].valorFormatado, /1\.000,00/)
  assert.equal(passo1.linhas[0].numero, 1)
  assert.equal(passo1.linhas[0].estado, 'Pago')
  assert.equal(passo1.linhas[1].numero, 2)
  assert.equal(passo1.linhas[1].estado, 'Pendente')

  // 1ª e 2ª pagas, 3ª atrasada (usando resumoParcelas da listagem GET /obras).
  const passo2 = montarResumoParcelas({
    parcelas: criarParcelas(2, 1000, 1000, 2),
    resumoParcelas: {
      total: 12,
      pagas: 2,
      valorParcelaBase: 1000,
      ultimaPaga: { numero: 2, valor: 1000, situacao: 'paga', estado: 'Pago' },
      penultimaPaga: { numero: 1, valor: 1000, situacao: 'paga', estado: 'Pago' },
      proximaNaoPaga: { numero: 3, valor: 1000, situacao: 'atrasada', estado: 'Atrasada' },
    },
  }, { origem: 'resumo' })
  assert.equal(passo2.linhas.length, 2)
  assert.equal(passo2.linhas[0].numero, 2)
  assert.equal(passo2.linhas[0].estado, 'Pago')
  assert.equal(passo2.linhas[1].numero, 3)
  assert.equal(passo2.linhas[1].estado, 'Atrasada')
})

// Garante comportamento na penúltima paga + última parcela e quando todas estão pagas, preservando centavos.
test('mostra estado da última parcela e exibe as duas últimas como Pago ao quitar tudo com centavos reais', () => {
  // 11 pagas, 12ª (última) atrasada com centavos diferentes.
  const faltaUltima = montarResumoParcelas(
    { parcelas: criarParcelas(12, 833.33, 833.37, 11, 12) },
    { origem: 'parcelas' },
  )
  assert.equal(faltaUltima.linhas.length, 2)
  assert.equal(faltaUltima.linhas[0].numero, 11)
  assert.equal(faltaUltima.linhas[0].estado, 'Pago')
  assert.match(faltaUltima.linhas[0].valorFormatado, /833,33/)
  assert.equal(faltaUltima.linhas[1].numero, 12)
  assert.equal(faltaUltima.linhas[1].estado, 'Atrasada')
  assert.match(faltaUltima.linhas[1].valorFormatado, /833,37/)

  // Todas pagas (12/12): mostra 11ª e 12ª como Pago com valores reais.
  const todasPagas = montarResumoParcelas(
    { parcelas: criarParcelas(12, 833.33, 833.37, 12) },
    { origem: 'parcelas' },
  )
  assert.equal(todasPagas.linhas.length, 2)
  assert.equal(todasPagas.linhas[0].numero, 11)
  assert.equal(todasPagas.linhas[0].estado, 'Pago')
  assert.match(todasPagas.linhas[0].valorFormatado, /833,33/)
  assert.equal(todasPagas.linhas[1].numero, 12)
  assert.equal(todasPagas.linhas[1].estado, 'Pago')
  assert.match(todasPagas.linhas[1].valorFormatado, /833,37/)
})

// Garante remoção de parênteses de textos financeiros antigos.
test('remove parênteses dos textos de resumo financeiro', () => {
  assert.equal(
    removerParentesesResumo('Contrato fechado com divisão em (12) etapas'),
    'Contrato fechado com divisão em 12 etapas',
  )
})
