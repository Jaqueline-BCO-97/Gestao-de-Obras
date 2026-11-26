// Importa o runner de testes nativo do Node e as asserções estritas.
import test from 'node:test'
import assert from 'node:assert/strict'
// Importa os utilitários puros de hidratação, leitura e mesclagem do Perfil.
import {
  TEXTO_NAO_INFORMADO,
  criarEstadosFormularioPerfil,
  formatarValorLeitura,
  mesclarUsuarioAtualizado,
  montarPayloadContato,
  montarPayloadEnderecoPessoal,
  usuarioPossuiEnderecoEmpresa,
} from '../src/utils/perfilDados.js'

// Garante que a hidratação do fallback local preenche contato, empresa e telefone adicional.
test('preenche todos os estados do formulário a partir do usuário local de fallback', () => {
  // Simula usuário salvo localmente com dados pessoais e empresa.
  const usuarioLocal = {
    nome: 'Carla Kleia',
    email: 'admin@obramaster.demo',
    tipo: 'ADMIN',
    telefone: '11999998888',
    telefoneSecundario: '1133334444',
    cpf: '52998224725',
    endereco: 'Rua das Flores',
    estado: 'SP',
    cidade: 'Santos',
    bairro: 'Gonzaga',
    numero: '100',
    empresa: {
      nome: 'CaiPim Reformas',
      endereco: 'Av. Ana Costa',
      numero: '67',
      estado: 'SP',
      cidade: 'Santos',
      bairro: 'Gonzaga',
    },
  }

  // Gera os estados iniciais usados no carregamento e no catch de fallback local.
  const estados = criarEstadosFormularioPerfil(usuarioLocal)
  // Confirma que os campos de contato foram preenchidos e formatados.
  assert.equal(estados.dadosContato.email, 'admin@obramaster.demo')
  assert.equal(estados.dadosContato.telefone, '(11) 99999-8888')
  assert.equal(estados.dadosContato.cpf, '529.982.247-25')
  // Confirma que o telefone adicional ficou visível por haver valor salvo.
  assert.equal(estados.mostrarTelefoneAdicional, true)
  // Confirma que o endereço da empresa também foi hidratado.
  assert.equal(estados.dadosEmpresaForm.endereco, 'Av. Ana Costa')
  assert.equal(estados.dadosEmpresaForm.numero, '67')
})

// Garante que valores vazios mostram "Não informado" no modo leitura.
test('exibe Não informado para valores vazios no modo leitura', () => {
  // Verifica null, undefined e string só com espaços.
  assert.equal(formatarValorLeitura(null), TEXTO_NAO_INFORMADO)
  assert.equal(formatarValorLeitura(undefined), TEXTO_NAO_INFORMADO)
  assert.equal(formatarValorLeitura('   '), TEXTO_NAO_INFORMADO)
  // Verifica valor válido preservado sem espaços nas pontas.
  assert.equal(formatarValorLeitura('  Santos  '), 'Santos')
})

// Garante separação de payloads por seção e exibição condicional do bloco da empresa.
test('separa payload de contato do endereço pessoal e preserva dados da empresa ao mesclar', () => {
  // Contato não deve enviar campos de endereço para não disparar validação de cliente sem necessidade.
  const contato = montarPayloadContato({ email: 'a@b.com', telefone: '1199', endereco: 'Rua X' })
  assert.deepEqual(contato, {
    email: 'a@b.com',
    telefone: '1199',
    telefoneSecundario: '',
    cpf: '',
  })

  // Endereço pessoal limpa apartamento/bloco quando as caixas "não tem" estão marcadas.
  const endereco = montarPayloadEnderecoPessoal({
    endereco: 'Rua A',
    estado: 'SP',
    cidade: 'Santos',
    bairro: 'Centro',
    numero: '10',
    apartamento: '42',
    semApartamento: true,
    bloco: 'B',
    semBloco: false,
  })
  assert.equal(endereco.apartamento, '')
  assert.equal(endereco.semApartamento, true)
  assert.equal(endereco.bloco, 'B')

  // Preserva nome e CNPJ da empresa quando o PATCH retorna só o subconjunto atualizado.
  const mesclado = mesclarUsuarioAtualizado(
    { id: '1', tipo: 'ADMIN', empresa: { nome: 'Empresa Demo', cnpj: '12345678000199', endereco: 'Antiga' } },
    { id: '1', tipo: 'ADMIN', empresa: { endereco: 'Nova Rua', numero: '50' } },
  )
  assert.equal(mesclado.empresa.nome, 'Empresa Demo')
  assert.equal(mesclado.empresa.endereco, 'Nova Rua')
  assert.equal(usuarioPossuiEnderecoEmpresa({ tipo: 'ADMIN' }), true)
  assert.equal(usuarioPossuiEnderecoEmpresa({ tipo: 'CLIENTE' }), false)
})
