function dataValida(data) {
  if (typeof data !== 'string' || !data.trim()) return false
  const valor = data.trim()
  const brasileira = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brasileira) {
    const [, dia, mes, ano] = brasileira
    const dataUTC = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)))
    return dataUTC.getUTCFullYear() === Number(ano)
      && dataUTC.getUTCMonth() === Number(mes) - 1
      && dataUTC.getUTCDate() === Number(dia)
  }
  return !Number.isNaN(Date.parse(valor))
}

// Mostra somente datas fornecidas e válidas; nunca fabrica vencimento para parcela pendente.
export function textoDataParcela(parcela = {}) {
  if (parcela.situacao === 'paga') {
    return dataValida(parcela.pagamento)
      ? `Pago em: ${parcela.pagamento}`
      : 'Data de pagamento não informada'
  }
  return dataValida(parcela.vencimento)
    ? `Vencimento: ${parcela.vencimento}`
    : 'Data de vencimento não informada'
}
