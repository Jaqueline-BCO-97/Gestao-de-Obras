import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpfValido, formatarCpf, somenteDigitosCpf } from '../src/utils/cpf.js'

test('masks and validates CPF correctly', () => {
  assert.equal(formatarCpf('52998224725'), '529.982.247-25')
  assert.equal(somenteDigitosCpf('529.982.247-25'), '52998224725')
  assert.equal(cpfValido('529.982.247-25'), true)
  assert.equal(cpfValido('111.111.111-11'), false)
  assert.equal(cpfValido('529.982.247-24'), false)
})
