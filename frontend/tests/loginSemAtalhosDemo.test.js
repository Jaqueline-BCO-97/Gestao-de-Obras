// Importa o executor de testes nativo do Node.js.
import test from 'node:test'
// Importa as verificações estritas para comparar o código da tela.
import assert from 'node:assert/strict'
// Importa a leitura de arquivos para conferir o componente sem dependência de navegador.
import { readFile } from 'node:fs/promises'

// Define o caminho do componente de login a partir da pasta deste teste.
const caminhoLogin = new URL('../src/pages/Login.jsx', import.meta.url)
// Lê o código do componente para validar que os atalhos foram removidos.
const codigoLogin = await readFile(caminhoLogin, 'utf8')

// Confirma que a tela não exibe os antigos atalhos de contas demo.
test('a tela de login não contém atalhos de demonstração', () => {
  // Confirma que não há mais import das credenciais de login rápido.
  assert.doesNotMatch(codigoLogin, /CONTAS_DEMO|config\/demo\.js/)
  // Confirma que não há mais estado nem função de autenticação rápida.
  assert.doesNotMatch(codigoLogin, /tipoDemoCarregando|entrarComoDemo/)
  // Confirma que os rótulos e a seção dos três botões não aparecem mais.
  assert.doesNotMatch(codigoLogin, /ACESSOS DE DEMONSTRAÇÃO|Entrar como Cliente|Entrar como Admin|Entrar como Gerente de Obra/)
})

// Confirma que o formulário de autenticação normal continua disponível.
test('o formulário normal de e-mail e senha continua autenticando', () => {
  // Confirma que o envio do formulário segue ligado ao manipulador existente.
  assert.match(codigoLogin, /<form onSubmit=\{enviar\} noValidate>/)
  // Confirma que a submissão ainda usa os valores digitados pelo usuário.
  assert.match(codigoLogin, /return autenticar\(email, senha\)/)
  // Confirma que o botão principal de login permanece no componente.
  assert.match(codigoLogin, /type="submit"/)
})
