// Centraliza a explicação mostrada quando a regra impede alterar o vencimento.
export const explicacaoBloqueioVencimento = 'Só é possível alterar o vencimento enquanto a obra não começou e nenhuma parcela tiver pagamento.'

// Verifica se as parcelas não têm sinais de pagamento antes de habilitar a tela.
function parcelaTemMovimentoPagamento(parcela) {
  // Usa o indicador do backend que considera tentativas em qualquer estado.
  if (parcela?.temMovimentoPagamento === true) return true
  // Mantém um bloqueio seguro se um backend antigo ainda não enviar o indicador.
  return parcela?.situacao === 'paga'
    || Boolean(parcela?.pagamento)
    || Boolean(parcela?.pagaEm)
    || Boolean(parcela?.comprovanteUrl)
    || Boolean(parcela?.comprovanteEnviadoEm)
    || Boolean(parcela?.tentativasPendentes?.length)
}

// Libera o controle somente para obra agendada com parcelas sem movimento.
export function podeAlterarVencimentoObra(obra) {
  // Obtém as parcelas completas retornadas pelo detalhe da obra.
  const parcelas = Array.isArray(obra?.parcelas) ? obra.parcelas : []
  // Exige status Agendada, pelo menos uma parcela e nenhuma movimentação.
  return obra?.status === 'Agendada'
    && parcelas.length > 0
    && parcelas.every((parcela) => !parcelaTemMovimentoPagamento(parcela))
}
