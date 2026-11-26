// Cria as mesmas 36 opções que o cadastro da obra já apresentava no select nativo.
export function criarOpcoesQuantidadeParcelas() {
  // Gera os valores de um até trinta e seis sem interromper a faixa existente.
  return Array.from({ length: 36 }, (_, indice) => {
    // Converte o índice iniciado em zero para a quantidade exibida no formulário.
    const quantidade = indice + 1
    // Mantém a regra visual de juros atual, sem mudar o cálculo da obra.
    const descricaoJuros = quantidade <= 12 ? ' · sem juros' : ' · juros de 1% por parcela adicional'
    // Mantém singular para uma parcela e plural para as demais opções.
    const texto = quantidade + ' parcela' + (quantidade === 1 ? '' : 's') + descricaoJuros
    // Devolve o valor textual esperado pelo estado atual do formulário.
    return { valor: String(quantidade), texto }
  })
}

// Recupera a quantidade atual da obra no formato controlado pelos formulários.
export function obterQuantidadeInicialObra(dados) {
  // Preserva o valor salvo e mantém os mesmos fallbacks históricos da edição.
  return String(dados.quantidadeParcelas || dados.parcelas?.length || 2)
}

// Localiza a opção que corresponde ao valor atual do formulário.
export function localizarIndiceQuantidadeParcelas(valor, opcoes = criarOpcoesQuantidadeParcelas()) {
  // Mantém a comparação textual porque os controles atualizam o estado com strings.
  return opcoes.findIndex((opcao) => opcao.valor === String(valor || ''))
}

// Converte a quantidade escolhida para o número que as rotas atuais já recebem.
export function normalizarQuantidadeParcelas(valor) {
  // Mantém a conversão numérica usada pelo cadastro e pela edição de obras.
  return Number(valor)
}

// Calcula a próxima ação do seletor para que o teclado e os testes usem as mesmas regras.
export function resolverTeclaQuantidadeParcelas(tecla, estado, total, indiceSelecionado = -1, desabilitado = false) {
  // Não permite abrir, navegar ou confirmar opções enquanto o campo estiver desabilitado.
  if (desabilitado) return null
  // Mantém o índice selecionado como referência ao abrir pelo teclado.
  const indiceInicial = indiceSelecionado >= 0 ? indiceSelecionado : 0
  // Mantém o último item como ponto inicial ao abrir para cima sem seleção.
  const indiceFinal = indiceSelecionado >= 0 ? indiceSelecionado : total - 1
  // Abre ou avança uma opção com a seta para baixo, sem ultrapassar o último item.
  if (tecla === 'ArrowDown') return { aberta: true, indiceAtivo: estado.aberta ? Math.min(total - 1, estado.indiceAtivo + 1) : indiceInicial, confirmar: null }
  // Abre ou volta uma opção com a seta para cima, sem ultrapassar o primeiro item.
  if (tecla === 'ArrowUp') return { aberta: true, indiceAtivo: estado.aberta ? Math.max(0, estado.indiceAtivo - 1) : indiceFinal, confirmar: null }
  // Leva o foco lógico ao primeiro item quando a tecla Home é pressionada.
  if (tecla === 'Home') return { aberta: true, indiceAtivo: 0, confirmar: null }
  // Leva o foco lógico ao último item quando a tecla End é pressionada.
  if (tecla === 'End') return { aberta: true, indiceAtivo: total - 1, confirmar: null }
  // Confirma a opção ativa ou abre a lista quando Enter é pressionado.
  if (tecla === 'Enter') return estado.aberta ? { aberta: false, indiceAtivo: estado.indiceAtivo, confirmar: estado.indiceAtivo } : { aberta: true, indiceAtivo: indiceInicial, confirmar: null }
  // Fecha a lista sem trocar o valor quando Escape é pressionado.
  if (tecla === 'Escape') return { aberta: false, indiceAtivo: estado.indiceAtivo, confirmar: null }
  // Informa que outras teclas não alteram o estado do seletor.
  return null
}

// Monta o mesmo payload enviado ao salvar uma obra a partir do formulário.
export function montarPayloadCriarObra(novaObra, valorTotal, fotos) {
  // Converte a quantidade escolhida para número antes do envio à API.
  return { ...novaObra, quantidadeParcelas: normalizarQuantidadeParcelas(novaObra.quantidadeParcelas), valorTotal, fotos }
}
