// Verifica se as parcelas da obra ainda não tiveram nenhum movimento de pagamento.
function obraSemMovimentoDePagamento(obra) {
  // Trata relações ausentes como uma lista vazia para manter a função reutilizável.
  const parcelas = Array.isArray(obra?.parcelas) ? obra.parcelas : [];
  // Exige que nenhuma parcela tenha sido paga, comprovada ou associada a tentativa.
  return parcelas.every((parcela) => parcela?.situacao !== "PAGA"
    && !parcela?.pagaEm
    && !parcela?.comprovanteUrl
    && !parcela?.comprovanteEnviadoEm
    && !parcela?.pagamentoExternoId
    && !(Array.isArray(parcela?.pagamentos) && parcela.pagamentos.length > 0));
}

// Exporta a regra pura para os fluxos de vencimento e F7.
module.exports = { obraSemMovimentoDePagamento };
