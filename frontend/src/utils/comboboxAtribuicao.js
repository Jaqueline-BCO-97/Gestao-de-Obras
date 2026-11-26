// Monta o novo texto de busca e limpa a obra que havia sido escolhida.
export function criarEstadoBuscaAtribuicao(busca) {
  // Mantém o que foi digitado como consulta atual.
  return { busca, obraId: '' }
}

// Informa quando o botão de atribuição deve ficar bloqueado.
export function atribuicaoDesabilitada(obraId, processando) {
  // Exige uma obra escolhida e nenhuma operação em andamento.
  return Boolean(processando) || !obraId
}

// Escolhe a mensagem de lista vazia conforme existam obras elegíveis.
export function mensagemVaziaObrasAtribuicao(quantidadeElegivel) {
  // Diferencia falta de obras disponíveis de uma busca sem correspondência.
  return quantidadeElegivel > 0 ? 'Nenhuma obra encontrada.' : 'Não há obras disponíveis para atribuir.'
}

// Atualiza abertura e destaque do combobox para uma tecla de navegação.
export function resolverTeclaComboboxAtribuicao(tecla, estado, quantidadeOpcoes) {
  // Calcula o último índice válido da lista filtrada.
  const ultimoIndice = quantidadeOpcoes - 1

  // Abre a lista e avança o destaque quando a seta para baixo é pressionada.
  if (tecla === 'ArrowDown') {
    // Continua após a opção ativa ou parte da escolhida e, sem uma delas, da primeira.
    const proximoIndice = estado.indiceAtivo >= 0 ? estado.indiceAtivo + 1 : estado.indiceSelecionado
    // Mantém o destaque dentro das opções existentes.
    return { aberta: true, indiceAtivo: quantidadeOpcoes > 0 ? Math.min(proximoIndice < 0 ? 0 : proximoIndice, ultimoIndice) : -1, prevenirPadrao: true }
  }

  // Abre a lista e volta o destaque quando a seta para cima é pressionada.
  if (tecla === 'ArrowUp') {
    // Continua antes da opção ativa ou parte da escolhida e, sem uma delas, da última.
    const indiceAnterior = estado.indiceAtivo >= 0 ? estado.indiceAtivo - 1 : estado.indiceSelecionado
    // Mantém o destaque dentro das opções existentes.
    return { aberta: true, indiceAtivo: quantidadeOpcoes > 0 ? Math.max(indiceAnterior < 0 ? ultimoIndice : indiceAnterior, 0) : -1, prevenirPadrao: true }
  }

  // Confirma a opção destacada quando Enter é pressionado com a lista aberta.
  if (tecla === 'Enter' && estado.aberta) {
    // Só retorna uma seleção quando o índice corresponde a uma opção real.
    const confirmar = estado.indiceAtivo >= 0 && estado.indiceAtivo < quantidadeOpcoes ? estado.indiceAtivo : null
    // Evita o envio acidental do formulário enquanto o combobox está aberto.
    return { aberta: confirmar === null, indiceAtivo: estado.indiceAtivo, confirmar, prevenirPadrao: true }
  }

  // Fecha a lista e remove o destaque quando Escape é pressionado.
  if (tecla === 'Escape' && estado.aberta) {
    // Informa à interface que a tecla foi tratada.
    return { aberta: false, indiceAtivo: -1, prevenirPadrao: true }
  }

  // Deixa o navegador tratar as teclas que não pertencem ao combobox.
  return null
}

// Cria os manipuladores de mouse e toque usados pelas opções da lista.
export function criarInteracaoOpcaoCombobox() {
  // Guarda se mouse ou toque está selecionando uma opção.
  let interacaoEmAndamento = false
  // Guarda a posição inicial e a lista usada para rolagem por toque.
  let inicioToque = null
  // Identifica quando o toque moveu a lista em vez de selecionar.
  let toqueMoveu = false
  // Evita que um clique sintetizado repita uma seleção por toque.
  let toqueSelecionou = false

  // Retorna se o blur precisa manter a lista aberta durante uma seleção.
  function manterListaNoBlur() {
    // Um clique ou toque em uma opção não deve fechá-la antes da seleção.
    return interacaoEmAndamento
  }

  // Preserva o foco no campo quando o mouse pressiona uma opção.
  function iniciarMouse(evento) {
    // Impede que o navegador transfira o foco para o item da lista.
    evento.preventDefault()
    // Marca a interação até o mouse ser solto.
    interacaoEmAndamento = true
  }

  // Finaliza o marcador de mouse após a liberação do botão.
  function finalizarMouse() {
    // Libera o fechamento normal por blur para ações futuras.
    interacaoEmAndamento = false
  }

  // Preserva o foco e registra o início de um toque numa opção.
  function iniciarToque(evento, lista) {
    // Lê o primeiro ponto de toque informado pelo navegador.
    const toque = evento.touches?.[0]
    // Para se o evento ou a lista não estiverem disponíveis.
    if (!toque || !lista) return
    // Evita blur e permite controlar a rolagem manual da lista.
    evento.preventDefault()
    // Marca a interação enquanto o dedo estiver sobre uma opção.
    interacaoEmAndamento = true
    // Guarda a posição inicial e a lista para acompanhar o gesto.
    inicioToque = { y: toque.clientY, scrollTop: lista.scrollTop, lista }
    // Reinicia a identificação de rolagem para este toque.
    toqueMoveu = false
  }

  // Acompanha o movimento do dedo para permitir rolar as opções.
  function moverToque(evento) {
    // Lê a posição atual do dedo.
    const toque = evento.touches?.[0]
    // Para se não houver posição atual ou um toque iniciado.
    if (!toque || !inicioToque) return
    // Mede a distância percorrida desde o começo do gesto.
    const deslocamento = inicioToque.y - toque.clientY
    // Considera rolagem somente depois de um movimento perceptível.
    if (Math.abs(deslocamento) > 5) {
      // Marca o gesto para não selecionar a opção ao soltar.
      toqueMoveu = true
      // Rola a lista de acordo com o deslocamento vertical do dedo.
      inicioToque.lista.scrollTop = inicioToque.scrollTop + deslocamento
    }
  }

  // Finaliza um toque, selecionando a opção ou mantendo a rolagem.
  function finalizarToque(indice, selecionar) {
    // Guarda se o gesto foi uma rolagem antes de limpar seus dados.
    const estavaRolando = toqueMoveu
    // Descarta o ponto inicial depois do fim do toque.
    inicioToque = null
    // Libera o próximo toque para começar do zero.
    toqueMoveu = false
    // Permite fechar a lista por blur depois que o gesto terminar.
    interacaoEmAndamento = false
    // Mantém o combobox aberto se o dedo estava rolando a lista.
    if (estavaRolando) return false
    // Marca a seleção para ignorar um clique sintetizado em seguida.
    toqueSelecionou = true
    // Aplica a mesma seleção usada pelo clique e teclado.
    selecionar(indice)
    // Limpa a marca caso o navegador não gere clique após o toque.
    globalThis.setTimeout(() => { toqueSelecionou = false }, 0)
    // Informa que a opção foi selecionada pelo toque.
    return true
  }

  // Seleciona uma opção pelo clique sem repetir o clique do toque.
  function selecionarPorClique(indice, selecionar) {
    // Ignora o clique que alguns navegadores enviam após touchend.
    if (toqueSelecionou) {
      // Libera a marca para o próximo clique do usuário.
      toqueSelecionou = false
      // Informa que o clique sintetizado foi ignorado.
      return false
    }
    // Finaliza qualquer marcador de interação antes de selecionar.
    interacaoEmAndamento = false
    // Usa o mesmo caminho de seleção da interação por toque.
    selecionar(indice)
    // Informa que a opção foi selecionada pelo clique.
    return true
  }

  // Descarta marcadores de interação quando o usuário clica fora da lista.
  function limparInteracao() {
    // Permite que o campo feche por blur depois de sair do seletor.
    interacaoEmAndamento = false
    // Descarta qualquer gesto de toque interrompido.
    inicioToque = null
    // Limpa o marcador de rolagem interrompida.
    toqueMoveu = false
  }

  // Expõe somente as ações necessárias pelo combobox e pelos testes.
  return { manterListaNoBlur, iniciarMouse, finalizarMouse, iniciarToque, moverToque, finalizarToque, selecionarPorClique, limparInteracao }
}
