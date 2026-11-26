// Usa o executor de testes nativo do Node já adotado pelo frontend.
import test from 'node:test'
// Usa as verificações nativas para manter o teste sem dependências adicionais.
import assert from 'node:assert/strict'
// Lê o componente para conferir mensagens fixas que fazem parte do contrato da tela.
import { readFile } from 'node:fs/promises'
// Importa a regra usada pelo formulário para validar a confirmação de senha.
import { avaliarSenhaConvite, obterDadosConviteGerente, senhasConferem } from '../src/utils/convite.js'

// Carrega o código da tela sem renderizar nem acessar serviços externos.
const codigoTelaAceite = await readFile(new URL('../src/pages/AceitarConvite.jsx', import.meta.url), 'utf8')
// Carrega a lista administrativa para conferir os fallbacks da obra opcional.
const codigoTelaGerentes = await readFile(new URL('../src/pages/AdminGerentes.jsx', import.meta.url), 'utf8')
// Carrega a tela de Gestão de Obras para verificar a resposta vazia do gerente.
const codigoTelaColaborador = await readFile(new URL('../src/pages/Colaborador.jsx', import.meta.url), 'utf8')

// Garante que uma confirmação diferente bloqueia o aceite do convite.
test('confirmação de senha só passa quando os valores são iguais', () => {
  // Senhas diferentes não podem ser aceitas pelo formulário.
  assert.equal(senhasConferem('Senha-1234', 'Senha-1235'), false)
  // Senhas idênticas permitem continuar para o envio ao backend.
  assert.equal(senhasConferem('Senha-1234', 'Senha-1234'), true)
})

// Confere que o formulário identifica somente a regra de comprimento pendente.
test('regra de senha marca oito caracteres como mínimo', () => {
  // Usa uma senha curta que já contém maiúscula, número e caractere especial.
  const resultado = avaliarSenhaConvite('A1@bcde')
  // Confirma que o mínimo não foi atingido.
  assert.equal(resultado.requisitos.find((item) => item.id === 'comprimento').valido, false)
  // Confirma que as demais regras estão cumpridas.
  assert.equal(resultado.requisitos.filter((item) => !item.valido).length, 1)
})

// Confere que o formulário identifica a falta de letra maiúscula.
test('regra de senha exige uma letra maiúscula', () => {
  // Usa uma senha longa com número e caractere especial, mas sem maiúscula.
  const resultado = avaliarSenhaConvite('senha123@')
  // Confirma que apenas a regra de maiúscula falhou.
  assert.deepEqual(resultado.requisitos.filter((item) => !item.valido).map((item) => item.id), ['maiuscula'])
})

// Confere que o formulário identifica a falta de número.
test('regra de senha exige um número', () => {
  // Usa uma senha longa com maiúscula e caractere especial, mas sem número.
  const resultado = avaliarSenhaConvite('Senhaabc@')
  // Confirma que apenas a regra de número falhou.
  assert.deepEqual(resultado.requisitos.filter((item) => !item.valido).map((item) => item.id), ['numero'])
})

// Confere que o formulário identifica a falta de caractere especial.
test('regra de senha exige um caractere especial', () => {
  // Usa uma senha longa com maiúscula e número, mas sem caractere especial.
  const resultado = avaliarSenhaConvite('Senha1234')
  // Confirma que apenas a regra de caractere especial falhou.
  assert.deepEqual(resultado.requisitos.filter((item) => !item.valido).map((item) => item.id), ['especial'])
})

// Confere que senhas de demonstração aprovadas continuam válidas.
test('regra de senha aceita Demo@12345 e exibe as quatro regras', () => {
  // Avalia a senha de demonstração sem submetê-la a qualquer endpoint.
  const resultado = avaliarSenhaConvite('Demo@12345')
  // Confirma que a senha satisfaz todos os requisitos.
  assert.equal(resultado.valida, true)
  // Confirma os textos de ajuda aprovados para a lista do formulário.
  assert.deepEqual(resultado.requisitos.map((item) => item.rotulo), [
    '8 ou mais caracteres',
    '1 letra maiúscula (ex.: A, B, C)',
    '1 número (ex.: 1, 2, 3)',
    '1 caractere especial (ex.: @ # ! $ %)',
  ])
})

// Confere a ajuda, o rodapé, o erro próprio de senha e a ausência de balão nativo.
test('tela de cliente tem textos aprovados e validação de senha em português', () => {
  // Confirma a linha de ajuda que acompanha o campo de e-mail.
  assert.ok(codigoTelaAceite.includes('Utilize o endereço de e-mail para o qual este convite foi enviado.'))
  // Confirma o rodapé e o link de entrada na conta existente.
  assert.ok(codigoTelaAceite.includes('Já possui uma conta?'))
  assert.ok(codigoTelaAceite.includes('com seu acesso existente para aceitar o convite.'))
  assert.ok(codigoTelaAceite.includes('<Link to="/login" className="text-sky-700 underline">Entre</Link>'))
  // Confirma a mensagem própria quando as duas senhas são diferentes.
  assert.ok(codigoTelaAceite.includes('As senhas não coincidem.'))
  // Confirma que o formulário sem sessão usa validação JavaScript sem balão nativo.
  assert.ok(codigoTelaAceite.includes('noValidate={!possuiSessao}'))
  assert.equal(codigoTelaAceite.includes('minLength'), false)
})

// Verifica os textos neutros usados quando os dados do gerente não vêm no GET.
test('convite de gerente usa fallbacks sem null ou undefined', () => {
  // Avalia o caso em que todos os dados opcionais estão ausentes.
  const dadosAusentes = obterDadosConviteGerente({ nome: null, empresa: null, obra: null, funcao: null })
  // Confirma a saudação neutra solicitada.
  assert.equal(dadosAusentes.saudacao, 'Olá!')
  // Confirma o fallback da empresa sem duplicar artigo.
  assert.equal(dadosAusentes.empresaConvite, 'A empresa')
  // Confirma que convite sem obra informa o vínculo futuro.
  assert.equal(dadosAusentes.obraVinculada, 'Você será vinculado a uma obra pela administração da empresa.')
  // Confirma que função ausente informa quem a definirá.
  assert.equal(dadosAusentes.funcaoConvidada, 'Definida pela administração da empresa')
  // Confirma que dados presentes aparecem sem perder o texto informado no GET.
  assert.deepEqual(obterDadosConviteGerente({ nome: 'Luciano', empresa: 'CaiPim Reformas', obra: 'Reforma A', funcao: 'Engenheiro' }), {
    saudacao: 'Olá, Luciano!',
    empresaConvite: 'A CaiPim Reformas',
    obraVinculada: 'Reforma A',
    funcaoConvidada: 'Engenheiro',
  })
  // Confirma os textos de destaque e o link de login próprios do gerente sem sessão.
  assert.ok(codigoTelaAceite.includes('OBRAMASTER · CONVITE DE EQUIPE'))
  assert.ok(codigoTelaAceite.includes('Você foi convidado para fazer parte de uma obra!'))
  assert.ok(codigoTelaAceite.includes('Já possui uma conta?'))
  assert.ok(codigoTelaAceite.includes('retorne a este convite.'))
  assert.ok(codigoTelaAceite.includes('<Link to="/login" className="text-sky-700 underline">Entre</Link>'))
  // Confirma que a tela especial do gerente não referencia o campo de e-mail.
  const trechoGerenteSemSessao = codigoTelaAceite.split('exigeApresentacaoGerente ? (')[1]?.split(') : exigeConfirmacaoCliente')[0] || ''
  assert.doesNotMatch(trechoGerenteSemSessao, /convite\.email/)
})

// Confirma que lista, reenvio e tela de obras tratam gerente sem escala.
test('lista e reenvia convite de gerente sem obra e mantém Gestão de Obras vazia', () => {
  // Confirma que a lista usa um rótulo explícito quando o convite não tem obra.
  assert.ok(codigoTelaGerentes.includes("convite.obra?.nome || 'Sem obra vinculada'"))
  // Confirma que a administração pode gerar um link novo para o convite pendente.
  assert.ok(codigoTelaGerentes.includes('reenviarConvite(id)'))
  assert.ok(codigoTelaGerentes.includes('Gerentes com convite pendente'))
  // Confirma que a tela busca as obras pela API e mostra o estado vazio.
  assert.ok(codigoTelaColaborador.includes('listarObras()'))
  assert.ok(codigoTelaColaborador.includes('Nenhuma obra com alocação ativa foi retornada para sua conta.'))
})
