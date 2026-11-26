// Usa o executor de testes nativo para não adicionar dependências ao frontend.
import test from 'node:test'
// Usa asserções nativas para conferir estados e eventos simulados.
import assert from 'node:assert/strict'
// Lê os componentes para conferir a ligação dos manipuladores e a posição dos controles.
import { readFile } from 'node:fs/promises'
// Importa o filtro F4b usado pela tela para mostrar obras elegíveis.
import { filtrarObrasAtribuiveis } from '../src/utils/obrasAtribuiveis.js'
// Importa o estado e as regras do combobox usadas pelo componente.
import { atribuicaoDesabilitada, criarEstadoBuscaAtribuicao, mensagemVaziaObrasAtribuicao, resolverTeclaComboboxAtribuicao, criarInteracaoOpcaoCombobox } from '../src/utils/comboboxAtribuicao.js'

// Carrega o cartão de gerente para conferir a posição única do botão.
const codigoTelaGerentes = await readFile(new URL('../src/pages/AdminGerentes.jsx', import.meta.url), 'utf8')
// Carrega o campo para conferir acessibilidade e eventos ligados à lista.
const codigoCombobox = await readFile(new URL('../src/components/ComboboxObraAtribuicao.jsx', import.meta.url), 'utf8')

// Confirma que a busca F4b continua ignorando acentos e diferença entre maiúsculas e minúsculas.
test('filtra obras elegíveis sem diferenciar acentos ou maiúsculas', () => {
  // Cria uma obra elegível cujo nome contém acentos e letras maiúsculas.
  const obras = [{ id: 'residencia', titulo: 'Residência São José', status: 'Agendada' }]
  // Representa um gerente sem obras ativas vinculadas.
  const gerente = { escalas: [] }
  // Busca sem acentos e em caixa baixa, como no campo do combobox.
  const resultado = filtrarObrasAtribuiveis(obras, gerente, 'residencia sao jose')
  // Confirma que a obra continua elegível para a busca F4b.
  assert.deepEqual(resultado.map((obra) => obra.id), ['residencia'])
})

// Simula mousedown, blur e click usando os mesmos manipuladores ligados às opções.
test('seleciona por clique e mantém a lista aberta durante o blur do mouse', () => {
  // Cria os mesmos marcadores de interação usados pelo componente.
  const interacao = criarInteracaoOpcaoCombobox()
  // Guarda a seleção que o manipulador de clique receber.
  let indiceSelecionado = -1
  // Registra se o mousedown cancelou a transferência de foco.
  let preveniuFoco = false
  // Executa o manipulador de mousedown com um evento simulado.
  interacao.iniciarMouse({ preventDefault: () => { preveniuFoco = true } })
  // Confirma que o campo mantém o foco para o blur não fechar a lista.
  assert.equal(preveniuFoco, true)
  // Confirma que o blur manteria a lista aberta durante o gesto do mouse.
  assert.equal(interacao.manterListaNoBlur(), true)
  // Finaliza o mousedown e executa o manipulador de clique da opção.
  interacao.finalizarMouse()
  assert.equal(interacao.selecionarPorClique(1, (indice) => { indiceSelecionado = indice }), true)
  // Confirma que o clique escolheu o índice esperado.
  assert.equal(indiceSelecionado, 1)
})

// Simula touchstart e touchend e garante que o clique sintetizado não duplique a escolha.
test('seleciona por toque e ignora o clique sintetizado seguinte', () => {
  // Cria os mesmos marcadores de interação usados pelo componente.
  const interacao = criarInteracaoOpcaoCombobox()
  // Guarda quantas vezes a opção foi selecionada.
  const selecoes = []
  // Cria uma lista simulada para o manipulador de toque.
  const lista = { scrollTop: 0 }
  // Inicia um toque e registra se o foco foi preservado.
  let preveniuFoco = false
  // Executa o manipulador de touchstart com um evento simulado.
  interacao.iniciarToque({ touches: [{ clientY: 20 }], preventDefault: () => { preveniuFoco = true } }, lista)
  // Confirma que o touchstart também impede o blur prematuro.
  assert.equal(preveniuFoco, true)
  // Confirma que o campo não deve fechar enquanto o toque está em andamento.
  assert.equal(interacao.manterListaNoBlur(), true)
  // Finaliza o toque e registra a seleção feita pelo manipulador.
  assert.equal(interacao.finalizarToque(2, (indice) => selecoes.push(indice)), true)
  // Confirma que o clique emitido pelo navegador não repete a seleção.
  assert.equal(interacao.selecionarPorClique(2, (indice) => selecoes.push(indice)), false)
  // Confirma que só houve uma seleção pelo toque.
  assert.deepEqual(selecoes, [2])
})

// Simula a rolagem manual que o componente usa depois de prevenir a rolagem padrão no toque.
test('toque que rola a lista não seleciona uma obra', () => {
  // Cria os mesmos marcadores de interação usados pelo componente.
  const interacao = criarInteracaoOpcaoCombobox()
  // Cria uma lista simulada com posição de rolagem conhecida.
  const lista = { scrollTop: 10 }
  // Guarda seleções para confirmar que a rolagem não escolhe uma opção.
  const selecoes = []
  // Inicia o toque na posição vertical 100 da lista.
  interacao.iniciarToque({ touches: [{ clientY: 100 }], preventDefault() {} }, lista)
  // Move o dedo 30 pixels para cima e deixa o manipulador rolar a lista.
  interacao.moverToque({ touches: [{ clientY: 70 }] })
  // Confirma que a rolagem acompanha o movimento do dedo.
  assert.equal(lista.scrollTop, 40)
  // Finaliza o gesto e confirma que a opção não é selecionada.
  assert.equal(interacao.finalizarToque(0, (indice) => selecoes.push(indice)), false)
  // Confirma que a lista continua sem seleção.
  assert.deepEqual(selecoes, [])
})

// Simula as setas e Enter pelas mesmas regras acionadas pelo onKeyDown do componente.
test('seleciona uma obra pela navegação de teclado', () => {
  // Abre a lista e destaca a primeira opção com a seta para baixo.
  const aberto = resolverTeclaComboboxAtribuicao('ArrowDown', { aberta: false, indiceAtivo: -1, indiceSelecionado: -1 }, 3)
  // Confirma que a primeira opção fica ativa e que a tecla não rola a página.
  assert.deepEqual(aberto, { aberta: true, indiceAtivo: 0, prevenirPadrao: true })
  // Confirma a primeira opção com Enter.
  const escolhido = resolverTeclaComboboxAtribuicao('Enter', aberto, 3)
  // Confirma que o resultado fecha a lista e devolve a opção selecionada.
  assert.deepEqual(escolhido, { aberta: false, indiceAtivo: 0, confirmar: 0, prevenirPadrao: true })
  // Confirma que Escape fecha uma lista sem selecionar outra obra.
  assert.deepEqual(resolverTeclaComboboxAtribuicao('Escape', aberto, 3), { aberta: false, indiceAtivo: -1, prevenirPadrao: true })
})

// Confirma que somente uma obra selecionada habilita o botão de atribuição.
test('mantém Atribuir desabilitado enquanto não houver escolha na lista', () => {
  // Bloqueia o envio sem uma obra selecionada.
  assert.equal(atribuicaoDesabilitada('', ''), true)
  // Libera o envio quando uma obra válida foi selecionada e não há processamento.
  assert.equal(atribuicaoDesabilitada('obra-1', ''), false)
  // Mantém o envio bloqueado enquanto a operação estiver processando.
  assert.equal(atribuicaoDesabilitada('obra-1', 'gerente-1'), true)
  // Confirma que o botão da tela usa a mesma regra testada.
  assert.ok(codigoTelaGerentes.includes('disabled={atribuicaoDesabilitada(selecoesAtribuicao[funcionario.id], processando)}'))
})

// Confirma que editar o texto limpa a seleção antiga antes de uma nova atribuição.
test('digitar depois da escolha limpa a obra selecionada', () => {
  // Cria o estado que a tela usa depois de uma mudança no texto da busca.
  const estadoDigitado = criarEstadoBuscaAtribuicao('cozinha nova')
  // Confirma que o texto novo permanece visível no campo.
  assert.equal(estadoDigitado.busca, 'cozinha nova')
  // Confirma que a obra anterior deixa de contar como escolha válida.
  assert.equal(estadoDigitado.obraId, '')
  // Confirma que a tela usa esse estado no manipulador de digitação.
  assert.ok(codigoTelaGerentes.includes('setSelecoesAtribuicao((atuais) => ({ ...atuais, [funcionarioId]: novoEstado.obraId }))'))
})

// Confirma que o sucesso fecha o painel e limpa a seleção e o texto do campo.
test('após atribuir com sucesso, fecha o painel e limpa o campo', () => {
  // Confirma que o painel de atribuição é fechado após o serviço concluir.
  assert.ok(codigoTelaGerentes.includes("setAtribuicaoAberta((atuais) => ({ ...atuais, [funcionario.id]: false }))"))
  // Confirma que a obra selecionada deixa de ser enviada novamente.
  assert.ok(codigoTelaGerentes.includes("setSelecoesAtribuicao((atuais) => ({ ...atuais, [funcionario.id]: '' }))"))
  // Confirma que o texto escolhido também desaparece do campo.
  assert.ok(codigoTelaGerentes.includes("setBuscasAtribuicao((atuais) => ({ ...atuais, [funcionario.id]: '' }))"))
  // Confirma que a tela atualiza funcionários e obras após a resposta de sucesso.
  assert.ok(codigoTelaGerentes.includes('await atualizar()'))
})

// Confirma posição e quantidade do botão para gerentes com e sem obras.
test('mostra um botão Atribuir obra depois das linhas e da mensagem sem obra', () => {
  // Conta as ocorrências do botão na tela para impedir repetições por escala.
  const botoesAtribuir = codigoTelaGerentes.match(/>Atribuir obra<\/Button>/g) || []
  // Confirma que há somente um botão no bloco renderizado de cada gerente.
  assert.equal(botoesAtribuir.length, 1)
  // Localiza a lista de escalas que antecede o botão único.
  const indiceLista = codigoTelaGerentes.indexOf('escalasFuncionario.length ? escalasFuncionario.map')
  // Localiza o botão único no texto do componente.
  const indiceBotao = codigoTelaGerentes.indexOf('>Atribuir obra</Button>')
  // Localiza o painel que deve ficar depois do botão.
  const indicePainel = codigoTelaGerentes.indexOf('<ComboboxObraAtribuicao')
  // Confirma que o botão está depois da lista e antes do painel.
  assert.ok(indiceLista >= 0 && indiceLista < indiceBotao && indiceBotao < indicePainel)
  // Confirma que a mensagem para gerente sem obras antecede o mesmo botão.
  assert.ok(codigoTelaGerentes.indexOf('Sem obra atribuída atualmente.') < indiceBotao)
  // Confirma que todas as linhas usam o mesmo alinhamento de nome e controles.
  assert.ok(codigoTelaGerentes.includes('sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'))
})

// Confirma as mensagens corretas quando não há opções ou a busca não encontra nomes.
test('mostra mensagem distinta para lista sem obras e busca sem resultado', () => {
  // Informa que não há obras disponíveis quando nenhuma passa pelo filtro F4b.
  assert.equal(mensagemVaziaObrasAtribuicao(0), 'Não há obras disponíveis para atribuir.')
  // Informa que a consulta não corresponde quando ainda há obras elegíveis.
  assert.equal(mensagemVaziaObrasAtribuicao(2), 'Nenhuma obra encontrada.')
  // Confirma que a tela exibe a mensagem calculada dentro do listbox.
  assert.ok(codigoTelaGerentes.includes('mensagemVazia={mensagemListaVazia}'))
  // Confirma que o componente renderiza a mensagem quando a busca não retorna opções.
  assert.ok(codigoCombobox.includes('{mensagemVazia}</li>'))
})

// Confirma os atributos acessíveis e o fechamento por ponteiro fora do componente.
test('expõe combobox acessível e fecha a lista ao clicar fora', () => {
  // Confirma que o campo anuncia seu papel de combobox e a lista ligada a ele.
  assert.ok(codigoCombobox.includes('role="combobox"'))
  assert.ok(codigoCombobox.includes('aria-haspopup="listbox"'))
  assert.ok(codigoCombobox.includes('aria-expanded={aberta}'))
  assert.ok(codigoCombobox.includes("aria-controls={id + '-lista'}"))
  // Confirma que o campo chama o manipulador real de navegação por teclado.
  assert.ok(codigoCombobox.includes('onKeyDown={lidarComTecla}'))
  // Confirma que a lista está ligada aos manipuladores de mouse e toque testados acima.
  assert.ok(codigoCombobox.includes('onMouseDown={interacao.iniciarMouse}'))
  assert.ok(codigoCombobox.includes('onTouchEnd={() => interacao.finalizarToque(indice, selecionarObra)}'))
  assert.ok(codigoCombobox.includes('onClick={() => interacao.selecionarPorClique(indice, selecionarObra)}'))
  // Confirma que o componente registra pointerdown fora da raiz.
  assert.ok(codigoCombobox.includes("document.addEventListener('pointerdown', fecharAoClicarFora)"))
})
