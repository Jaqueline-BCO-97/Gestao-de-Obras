// A chave vive apenas na sessão da aba e o escopo inclui os dados da cobrança.
export function obterChavePagamento(armazenamento, { obraId, parcelaId, valor }, gerar = () => crypto.randomUUID()) {
  const escopo = `${obraId}:${parcelaId}:${Number(valor).toFixed(2)}`
  const chaveArmazenamento = `checkout:${escopo}`
  let chave = armazenamento.getItem(chaveArmazenamento)
  if (!chave) {
    chave = gerar()
    armazenamento.setItem(chaveArmazenamento, chave)
  }
  return chave
}

export function limparChavePagamento(armazenamento, { obraId, parcelaId, valor }) {
  armazenamento.removeItem(`checkout:${obraId}:${parcelaId}:${Number(valor).toFixed(2)}`)
}
