import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('andamento do cliente tem rota protegida, histórico visível e retorno amigável', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const detalhe = await readFile(new URL('../src/pages/ClienteObra.jsx', import.meta.url), 'utf8')
  const andamento = await readFile(new URL('../src/pages/ClienteAndamento.jsx', import.meta.url), 'utf8')
  assert.match(app, /path="\/cliente\/obra\/:id\/andamento"[\s\S]*?perfisPermitidos=\{\['CLIENTE'\]\}/)
  assert.match(detalhe, /Ver andamento completo/)
  assert.match(andamento, /buscarObra\(id\)/)
  assert.match(andamento, /<HistoricoObra eventos=\{eventos\} perfil="CLIENTE"/)
  assert.match(andamento, /Voltar para Minhas Obras/)
  assert.match(andamento, /Fotos da obra/)
})
