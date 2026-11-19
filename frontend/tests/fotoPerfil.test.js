import test from 'node:test'
import assert from 'node:assert/strict'
import { obterFotoPerfil } from '../src/utils/fotoPerfil.js'

test('usa a foto de demonstração correspondente ao perfil', () => {
  assert.equal(obterFotoPerfil({ email: 'admin@obramaster.demo' }), '/foto-admin.png')
  assert.equal(obterFotoPerfil({ email: 'cliente@obramaster.demo' }), '/foto-cliente.png')
  assert.equal(obterFotoPerfil({ email: 'colaborador@obramaster.demo' }), '/foto-colaborador.png')
})

test('prioriza a foto enviada pelo usuário sobre a foto de demonstração', () => {
  assert.equal(obterFotoPerfil({ email: 'cliente@obramaster.demo', fotoUrl: 'https://exemplo.test/foto.png' }), 'https://exemplo.test/foto.png')
})

test('não atribui foto de demonstração a contas comuns sem foto salva', () => {
  assert.equal(obterFotoPerfil({ email: 'pessoa@example.com' }), '')
  assert.equal(obterFotoPerfil(null), '')
})
