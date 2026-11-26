// Formata valores numéricos para moeda brasileira (ex.: "R$ 1.000,00").
export function formatarMoedaParcela(valor) {
  // Converte para número seguro e aplica formatação pt-BR em reais.
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0))
}

// Remove parênteses ao redor de números ou valores em textos financeiros vindos da API.
export function removerParentesesResumo(texto = '') {
  // Substitui "(12)" por "12" mantendo o restante da frase preservado.
  return String(texto || '').replace(/\((\s*[^()]+\s*)\)/g, (_, conteudo) => conteudo.trim())
}

// Ordena a lista de parcelas recebidas da obra (ou fallback legado parcela1/parcela2).
export function normalizarParcelasObra(obra = {}) {
  // Dá preferência ao array completo de parcelas quando existir.
  const lista = Array.isArray(obra?.parcelas) && obra.parcelas.length
    ? obra.parcelas
    : [obra?.parcela1, obra?.parcela2]
  // Remove itens nulos e ordena pelo número sequencial crescente.
  return lista
    .filter(Boolean)
    .sort((a, b) => Number(a.numero || 0) - Number(b.numero || 0))
}

// Informa se uma parcela já foi quitada sem recalcular status.
function ehPaga(parcela) {
  // Aceita tanto o formato da API ("paga" / "PAGA") quanto o estado formatado ("Pago").
  const situacao = String(parcela?.situacao || '').toLocaleLowerCase('pt-BR')
  return situacao === 'paga' || parcela?.estado === 'Pago'
}

// Converte a situação de uma parcela não paga para o rótulo visual padronizado.
function rotuloNaoPaga(parcela) {
  // Mantém a classificação calculada pelo backend ("Atrasada" ou "Pendente").
  const situacao = String(parcela?.situacao || '').toLocaleLowerCase('pt-BR')
  if (situacao === 'atrasada' || parcela?.estado === 'Atrasada') return 'Atrasada'
  return 'Pendente'
}

// Extrai o resumo estruturado usando resumoParcelas (listagem) ou todas as parcelas (detalhes).
function obterDadosBaseResumo(obra = {}, origem = 'auto') {
  // Nos cartões da listagem, prioriza o campo somente leitura resumoParcelas vindo de GET /obras.
  const usarResumoApi = (origem === 'resumo' || origem === 'auto') && obra?.resumoParcelas
  if (usarResumoApi) {
    // Retorna os campos já agregados pelo backend sem alterar valores nem status.
    const resumo = obra.resumoParcelas
    return {
      total: Number(resumo.total || 0),
      pagas: Number(resumo.pagas || 0),
      valorParcelaBase: resumo.valorParcelaBase ?? null,
      ultimaPaga: resumo.ultimaPaga || null,
      penultimaPaga: resumo.penultimaPaga || null,
      proximaNaoPaga: resumo.proximaNaoPaga || null,
    }
  }

  // Nos detalhes da obra (ou em objetos mockados sem resumoParcelas), usa o conjunto completo de parcelas.
  const parcelas = normalizarParcelasObra(obra)
  // Separa parcelas quitadas das pendentes/atrasadas preservando a ordem numérica.
  const pagasLista = parcelas.filter(ehPaga)
  const naoPagasLista = parcelas.filter((parcela) => !ehPaga(parcela))
  // Usa o total de parcelas reais ou o contador cadastrado na obra.
  const total = parcelas.length || Number(obra?.quantidadeParcelas || 0)
  // Obtém a última paga, a penúltima paga (quando todas estão pagas) e a próxima não paga.
  const ultimaPaga = pagasLista.length ? pagasLista[pagasLista.length - 1] : null
  const penultimaPaga = pagasLista.length >= 2 ? pagasLista[pagasLista.length - 2] : null
  const proximaNaoPaga = naoPagasLista.length ? naoPagasLista[0] : null
  // Usa o valor real da 1ª parcela para compor o cabeçalho "N parcelas de R$ X".
  const valorParcelaBase = parcelas[0] ? Number(parcelas[0].valor) : null

  return {
    total,
    pagas: pagasLista.length,
    valorParcelaBase,
    ultimaPaga: ultimaPaga
      ? { numero: Number(ultimaPaga.numero), valor: Number(ultimaPaga.valor), estado: 'Pago' }
      : null,
    penultimaPaga: penultimaPaga
      ? { numero: Number(penultimaPaga.numero), valor: Number(penultimaPaga.valor), estado: 'Pago' }
      : null,
    proximaNaoPaga: proximaNaoPaga
      ? { numero: Number(proximaNaoPaga.numero), valor: Number(proximaNaoPaga.valor), estado: rotuloNaoPaga(proximaNaoPaga) }
      : null,
  }
}

// Monta os textos finais do bloco "Parcelas" sem parênteses e com no máximo 2 linhas.
export function montarResumoParcelas(obra = {}, { origem = 'auto' } = {}) {
  // Obtém os dados consolidados da origem escolhida ("resumo" nos cartões ou "parcelas" nos detalhes).
  const dados = obterDadosBaseResumo(obra, origem)

  // Quando não existem parcelas cadastradas na obra.
  if (!dados.total) {
    return {
      vazio: true,
      cabecalho: 'Não cadastradas',
      linhas: [],
    }
  }

  // Formata o valor base da parcela e a concordância singular/plural de "parcela(s)".
  const valorBaseTexto = formatarMoedaParcela(dados.valorParcelaBase ?? 0)
  const palavraParcela = dados.total === 1 ? 'parcela' : 'parcelas'

  // Caso 1: Nenhuma parcela paga até o momento.
  if (dados.pagas === 0) {
    // Em obra de 1 única parcela, reflete se ela está atrasada ou ainda pendente.
    if (dados.total === 1) {
      const estadoUnica = dados.proximaNaoPaga?.estado === 'Atrasada' ? 'Atrasada' : 'ainda pendente'
      return {
        vazio: false,
        cabecalho: `1 parcela de ${valorBaseTexto} — ${estadoUnica}`,
        linhas: [],
      }
    }
    // Para 2 ou mais parcelas sem pagamento, usa o formato "12 parcelas de R$ X — ainda pendentes".
    return {
      vazio: false,
      cabecalho: `${dados.total} ${palavraParcela} de ${valorBaseTexto} — ainda pendentes`,
      linhas: [],
    }
  }

  // Caso 2: Ao menos uma parcela paga — exibe cabeçalho + sempre 2 linhas (ou 1 se total === 1).
  const cabecalho = `${dados.total} ${palavraParcela} de ${valorBaseTexto}`
  const linhas = []

  // Quando existe ao menos uma parcela ainda não paga, mostra a última paga e a próxima não paga.
  if (dados.proximaNaoPaga) {
    // Linha 1: última parcela quitada (com seu valor real e estado "Pago").
    if (dados.ultimaPaga) {
      linhas.push({
        numero: dados.ultimaPaga.numero,
        valorFormatado: formatarMoedaParcela(dados.ultimaPaga.valor),
        estado: 'Pago',
      })
    }
    // Linha 2: próxima parcela não paga (com seu valor real e estado "Pendente" ou "Atrasada").
    linhas.push({
      numero: dados.proximaNaoPaga.numero,
      valorFormatado: formatarMoedaParcela(dados.proximaNaoPaga.valor),
      estado: dados.proximaNaoPaga.estado === 'Atrasada' ? 'Atrasada' : 'Pendente',
    })
  } else if (dados.total >= 2 && dados.penultimaPaga && dados.ultimaPaga) {
    // Quando todas as parcelas estão pagas, mostra as duas últimas com seus valores reais e "Pago".
    linhas.push({
      numero: dados.penultimaPaga.numero,
      valorFormatado: formatarMoedaParcela(dados.penultimaPaga.valor),
      estado: 'Pago',
    })
    linhas.push({
      numero: dados.ultimaPaga.numero,
      valorFormatado: formatarMoedaParcela(dados.ultimaPaga.valor),
      estado: 'Pago',
    })
  } else if (dados.ultimaPaga) {
    // Caso extremo de obra com apenas 1 parcela já quitada.
    linhas.push({
      numero: dados.ultimaPaga.numero,
      valorFormatado: formatarMoedaParcela(dados.ultimaPaga.valor),
      estado: 'Pago',
    })
  }

  // Devolve o resumo pronto para o componente ResumoParcelas renderizar.
  return {
    vazio: false,
    cabecalho,
    linhas,
  }
}
