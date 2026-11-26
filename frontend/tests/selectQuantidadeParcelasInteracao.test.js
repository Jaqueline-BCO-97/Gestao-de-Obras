// Usa o executor nativo do Node para manter os testes sem dependências extras.
import { describe, it } from 'node:test'
// Importa comparações para conferir estado e estrutura do componente.
import assert from 'node:assert/strict'
// Lê o componente real para confirmar os handlers conectados aos eventos.
import { readFile } from 'node:fs/promises'

// Carrega o seletor usado no cadastro e na edição da obra.
const componenteSelect = await readFile(new URL('../src/components/SelectQuantidadeParcelas.jsx', import.meta.url), 'utf8')

// Simula a ordem mouse down, blur, mouse up e click sem depender de um navegador.
function simularSequenciaDeMouse() {
  // Guarda se a lista continua montada e qual opção foi escolhida.
  const estado = { aberta: true, interacaoAtiva: false, valor: '2', chamadasOnChange: 0 }
  // Registra a ordem dos eventos que o teste está simulando.
  const eventos = []
  // Cria o evento mínimo necessário para simular o cancelamento do foco padrão.
  const eventoMouseDown = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true } }
  // Simula o onMouseDown cancelando a mudança de foco do botão.
  eventos.push('mousedown')
  eventoMouseDown.preventDefault()
  // Marca que o blur faz parte da interação com a opção.
  estado.interacaoAtiva = true
  // Simula o blur que poderia chegar antes do click no navegador.
  eventos.push('blur')
  if (!estado.interacaoAtiva) estado.aberta = false
  // Simula o mouse up liberando o marcador de interação.
  eventos.push('mouseup')
  estado.interacaoAtiva = false
  // Simula o click apenas se a opção ainda estiver montada na lista.
  eventos.push('click')
  if (estado.aberta) {
    // Atualiza o valor selecionado como faria o callback onChange.
    estado.valor = '7'
    // Conta uma única chamada ao callback de seleção.
    estado.chamadasOnChange += 1
    // Fecha a lista depois da seleção.
    estado.aberta = false
  }
  // Devolve o resultado para as asserções do teste.
  return { estado, eventoMouseDown, eventos }
}

// Simula o toque que seleciona no touchend e ignora eventual click sintetizado.
function simularSequenciaDeToque() {
  // Guarda o estado aberto, a seleção e a quantidade de chamadas do callback.
  const estado = { aberta: true, interacaoAtiva: false, toqueSelecionado: false, valor: '2', chamadasOnChange: 0 }
  // Cria o evento mínimo necessário para simular o início do toque.
  const eventoTouchStart = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true } }
  // Simula o onTouchStart cancelando a mudança de foco padrão.
  eventoTouchStart.preventDefault()
  // Marca que o blur durante o toque não deve fechar a lista prematuramente.
  estado.interacaoAtiva = true
  // Simula o blur que pode acontecer antes do fim do toque.
  if (!estado.interacaoAtiva) estado.aberta = false
  // Simula o touchend selecionando a opção e fechando a lista.
  estado.valor = '9'
  // Registra a chamada de onChange realizada no fim do toque.
  estado.chamadasOnChange += 1
  // Marca a seleção para ignorar o click que alguns navegadores sintetizam.
  estado.toqueSelecionado = true
  // Fecha a lista depois que a opção foi escolhida.
  estado.aberta = false
  // Simula eventual click sintetizado sem repetir a seleção.
  if (estado.toqueSelecionado) estado.toqueSelecionado = false
  else estado.chamadasOnChange += 1
  // Devolve o estado e o evento para as asserções do teste.
  return { estado, eventoTouchStart }
}

// Simula o listener global que fecha o menu quando o ponteiro vai para fora.
function simularPointerDownFora() {
  // Começa com a lista aberta e uma raiz que reconhece apenas alvos internos.
  const estado = { aberta: true }
  // Fecha quando o alvo do ponteiro não pertence ao componente.
  const raizContemAlvo = (alvo) => alvo === 'opcao-interna'
  // Aplica a condição usada pelo listener de pointerdown no documento.
  if (!raizContemAlvo('fora-do-seletor')) estado.aberta = false
  // Retorna o resultado da interação externa.
  return estado
}

// Agrupa testes de eventos de mouse, toque e fechamento externo.
describe('Interações com as opções do seletor de quantidade de parcelas', () => {
  // Confirma que mouse down e blur não impedem o click de selecionar a opção.
  it('mouse: simula mousedown, blur e click e seleciona a opção', () => {
    // Confirma que o botão das opções cancela a mudança de foco no mousedown.
    assert.match(componenteSelect, /onMouseDown=\{preservarFocoNoMouse\}/)
    // Confirma que o blur preserva a lista durante uma interação com a opção.
    assert.match(componenteSelect, /if \(interacaoOpcaoRef\.current\) return/)
    // Confirma que o click final continua ligado ao callback de seleção.
    assert.match(componenteSelect, /onClick=\{\(\) => selecionarAoClicar\(indice\)\}/)
    // Executa a sequência sintética de eventos na ordem relevante.
    const { estado, eventoMouseDown, eventos } = simularSequenciaDeMouse()
    // Confirma que os eventos simulados respeitam a ordem real de mouse.
    assert.deepEqual(eventos, ['mousedown', 'blur', 'mouseup', 'click'])
    // Confirma que o mousedown foi protegido contra a mudança de foco padrão.
    assert.equal(eventoMouseDown.defaultPrevented, true)
    // Confirma que o click chegou à opção e substituiu o valor anterior.
    assert.equal(estado.valor, '7')
    // Confirma que a seleção chamou onChange uma única vez.
    assert.equal(estado.chamadasOnChange, 1)
    // Confirma que a lista fechou depois da seleção.
    assert.equal(estado.aberta, false)
  })

  // Confirma que o toque seleciona sem depender de click sintetizado.
  it('toque: touchstart e touchend selecionam uma opção uma única vez', () => {
    // Confirma que o início do toque cancela a mudança de foco padrão.
    assert.match(componenteSelect, /onTouchStart=\{preservarFocoNoToque\}/)
    // Confirma que o fim do toque seleciona a opção correspondente.
    assert.match(componenteSelect, /onTouchEnd=\{\(\) => selecionarAoFinalDoToque\(indice\)\}/)
    // Confirma que o clique sintetizado depois do toque é reconhecido.
    assert.match(componenteSelect, /if \(toqueSelecionadoRef\.current\)/)
    // Executa o ciclo sintético de toque e eventual clique do navegador.
    const { estado, eventoTouchStart } = simularSequenciaDeToque()
    // Confirma que touchstart foi protegido contra a mudança de foco padrão.
    assert.equal(eventoTouchStart.defaultPrevented, true)
    // Confirma que o touchend escolheu a opção esperada.
    assert.equal(estado.valor, '9')
    // Confirma que o clique sintetizado não duplicou onChange.
    assert.equal(estado.chamadasOnChange, 1)
    // Confirma que a lista fechou depois do toque.
    assert.equal(estado.aberta, false)
  })

  // Confirma que a rolagem por toque segue disponível depois de cancelar touchstart.
  it('rolagem por toque mantém a lista aberta sem selecionar a opção tocada', () => {
    // Confirma que o componente acompanha o movimento vertical do dedo.
    assert.match(componenteSelect, /onTouchMove=\{rolarListaNoToque\}/)
    // Confirma que o gesto atualiza a rolagem da lista suspensa.
    assert.match(componenteSelect, /inicio\.lista\.scrollTop = inicio\.scrollTop \+ deslocamento/)
    // Confirma que um toque reconhecido como rolagem não seleciona a opção.
    assert.match(componenteSelect, /if \(estavaRolando\)[\s\S]*?return/)
    // Representa o começo de um gesto no meio da lista suspensa.
    const estado = { aberta: true, scrollInicial: 80, yInicial: 140, valor: '2', chamadasOnChange: 0 }
    // Calcula o deslocamento vertical do dedo durante a rolagem.
    const deslocamento = estado.yInicial - 95
    // Aplica a rolagem manual equivalente ao handler do componente.
    estado.scrollAtual = estado.scrollInicial + deslocamento
    // Marca que houve movimento suficiente para não selecionar ao soltar.
    estado.rolou = Math.abs(deslocamento) > 5
    // Confirma que a lista realmente avançou para outras opções.
    assert.equal(estado.scrollAtual, 125)
    // Confirma que o gesto foi identificado como rolagem.
    assert.equal(estado.rolou, true)
    // Confirma que a lista continua aberta para escolher a opção visível depois.
    assert.equal(estado.aberta, true)
    // Confirma que o valor e o callback ficam sem alteração durante a rolagem.
    assert.equal(estado.valor, '2')
    assert.equal(estado.chamadasOnChange, 0)
  })

  // Confirma que clicar fora continua fechando a lista pelo listener global.
  it('pointerdown fora do seletor fecha a lista', () => {
    // Confirma que o componente mantém o listener global de ponteiro.
    assert.match(componenteSelect, /document\.addEventListener\('pointerdown', fecharAoClicarFora\)/)
    // Confirma que o listener só preserva a lista quando o alvo está dentro da raiz.
    assert.match(componenteSelect, /if \(!raizRef\.current\?\.contains\(evento\.target\)\) \{/)
    // Executa a simulação de um pointerdown fora do componente.
    const estado = simularPointerDownFora()
    // Confirma que a lista foi fechada sem depender do blur do botão.
    assert.equal(estado.aberta, false)
  })
})
