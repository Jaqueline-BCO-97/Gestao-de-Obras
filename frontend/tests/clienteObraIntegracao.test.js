import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const pagina = await readFile(fileURLToPath(new URL('../src/pages/ClienteObra.jsx', import.meta.url)), 'utf8')
const painel = await readFile(fileURLToPath(new URL('../src/pages/Cliente.jsx', import.meta.url)), 'utf8')

test('detalhe exibe fotos reais da obra e do histórico sem montar registros fictícios', () => {
  assert.match(pagina, /aria-label="Galeria de fotos"/)
  assert.match(pagina, /\[\.\.\.\(obra\.fotos \|\| \[\]\)/)
  assert.match(pagina, /evento\.fotoUrl/)
  assert.doesNotMatch(pagina, /Registro #\{indice|>\s*Mock\s*</)
})

test('confirmação da conclusão chama API real após confirmação explícita', () => {
  assert.doesNotMatch(pagina, /confirmacaoRegistrada/)
  assert.match(pagina, /confirmarConclusaoObra\(id\)/)
  assert.match(pagina, /window\.confirm\(/)
  assert.match(pagina, /buscarObra\(id\)/)
  assert.match(pagina, /obra\.status === 'Aguardando conferência'/)
})

test('as duas telas registram e removem o listener online sem duplicar o polling', () => {
  for (const componente of [painel, pagina]) {
    assert.match(componente, /registrarListenerOnline\(atualizar(?:Obras|Obra)\)/)
    assert.match(componente, /removerListenerOnline\(\)/)
    assert.match(componente, /setInterval\(atualizar(?:Obras|Obra), 30000\)/)
    assert.match(componente, /consultaEmAndamento/)
  }
})

test('a rota usa chave por ID para recriar o estado da página de detalhes', () => {
  assert.match(pagina, /<ClienteObraConteudo key=\{id\} id=\{id\} \/>/)
  assert.match(pagina, /let ativo = true[\s\S]*?ativo = false/)
})
