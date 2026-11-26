// Compara senha e confirmação sem alterar os valores digitados.
export function senhasConferem(senha, confirmacao) {
  // Retorna verdadeiro somente quando os dois campos são idênticos.
  return senha === confirmacao
}
