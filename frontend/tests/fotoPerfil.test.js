import test from 'node:test'
import assert from 'node:assert/strict'
import { obterFotoPerfil } from '../src/utils/fotoPerfil.js'

test('usa a foto de demonstração correspondente ao perfil', () => {
  // Confere a imagem específica da administradora demo.
  assert.equal(obterFotoPerfil({ email: 'admin@obramaster.demo' }), '/foto-perfil/foto-admin.png')
  // Confere a imagem específica da cliente demo.
  assert.equal(obterFotoPerfil({ email: 'cliente@obramaster.demo' }), '/foto-perfil/foto-cliente.png')
  // Confere a imagem do gerente demo atual.
  assert.equal(obterFotoPerfil({ email: 'colaborador@obramaster.demo' }), '/foto-perfil/foto-colaborador1.png')
  // Confere a imagem do gerente Luciano sem incluir sua conta no login rápido.
  assert.equal(obterFotoPerfil({ email: 'colaborador2@obramaster.demo' }), '/foto-perfil/foto-colaborador2.png')
  // Confere a imagem do gerente Jhonatan sem incluir sua conta no login rápido.
  assert.equal(obterFotoPerfil({ email: 'colaborador3@obramaster.demo' }), '/foto-perfil/foto-colaborador3.png')
})

test('prioriza a foto enviada pelo usuário sobre a foto de demonstração', () => {
  assert.equal(obterFotoPerfil({ email: 'cliente@obramaster.demo', fotoUrl: 'https://exemplo.test/foto.png' }), 'https://exemplo.test/foto.png')
})

test('não atribui foto de demonstração a contas comuns sem foto salva', () => {
  assert.equal(obterFotoPerfil({ email: 'pessoa@example.com' }), '')
  assert.equal(obterFotoPerfil(null), '')
})
