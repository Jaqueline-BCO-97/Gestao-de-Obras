// Usa o runner nativo de testes do Node.
import test from 'node:test'
// Usa asserções estritas para conferir o nome salvo na sessão.
import assert from 'node:assert/strict'
// Importa o mock local usado quando a tela não recebe uma sessão da API.
import { salvarSessaoMock } from '../src/services/auth.js'

// Mantém os nomes do mock local alinhados às contas de demonstração atuais.
test('usa Carla Kleia e Marthania Soares nas sessões mockadas', () => {
  // Guarda os objetos de armazenamento globais existentes para restaurá-los ao final.
  const localStorageAnterior = globalThis.localStorage
  const sessionStorageAnterior = globalThis.sessionStorage
  // Cria armazenamentos simples compatíveis com a interface usada pelo serviço.
  const criarArmazenamento = () => {
    const dados = new Map()
    return {
      getItem: (chave) => dados.get(chave) ?? null,
      setItem: (chave, valor) => dados.set(chave, String(valor)),
      removeItem: (chave) => dados.delete(chave),
    }
  }

  // Instala armazenamentos isolados para que o teste não dependa de navegador.
  globalThis.localStorage = criarArmazenamento()
  globalThis.sessionStorage = criarArmazenamento()
  try {
    // Confere o nome salvo para o perfil administrativo mockado.
    const admin = salvarSessaoMock('ADMIN').usuario
    assert.equal(admin.nome, 'Carla Kleia')
    // Confere o nome e o slogan da empresa demo no perfil administrativo local.
    assert.deepEqual(admin.empresa, { nome: 'CaiPim Reformas', slogan: 'O toque final que dá vida ao seu projeto.' })
    // Confere o nome salvo para o perfil do cliente mockado.
    assert.equal(salvarSessaoMock('CLIENTE').usuario.nome, 'Marthania Soares')
  } finally {
    // Restaura os globais para não afetar outros testes.
    if (localStorageAnterior === undefined) delete globalThis.localStorage
    else globalThis.localStorage = localStorageAnterior
    if (sessionStorageAnterior === undefined) delete globalThis.sessionStorage
    else globalThis.sessionStorage = sessionStorageAnterior
  }
})
