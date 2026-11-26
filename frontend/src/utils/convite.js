// Compara senha e confirmação sem alterar os valores digitados.
export function senhasConferem(senha, confirmacao) {
  // Retorna verdadeiro somente quando os dois campos são idênticos.
  return senha === confirmacao
}

// Avalia as regras de senha de convites sem envolver a tela ou a rede.
export function avaliarSenhaConvite(senha) {
  // Trata valores ausentes ou não textuais como senha vazia.
  const valor = typeof senha === 'string' ? senha : ''
  // Monta os requisitos exibidos abaixo do campo enquanto a pessoa digita.
  const requisitos = [
    // Marca como válida a senha que contém ao menos oito caracteres.
    { id: 'comprimento', valido: Array.from(valor).length >= 8, rotulo: '8 ou mais caracteres', erro: 'A senha deve ter pelo menos 8 caracteres.' },
    // Marca como válida a senha que contém ao menos uma letra maiúscula.
    { id: 'maiuscula', valido: /\p{Lu}/u.test(valor), rotulo: '1 letra maiúscula (ex.: A, B, C)', erro: 'A senha deve conter pelo menos uma letra maiúscula.' },
    // Marca como válida a senha que contém ao menos um número.
    { id: 'numero', valido: /\p{N}/u.test(valor), rotulo: '1 número (ex.: 1, 2, 3)', erro: 'A senha deve conter pelo menos um número.' },
    // Marca como válida a senha que contém ao menos um caractere que não seja letra nem número.
    { id: 'especial', valido: /[^\p{L}\p{N}]/u.test(valor), rotulo: '1 caractere especial (ex.: @ # ! $ %)', erro: 'A senha deve conter pelo menos um caractere especial.' },
  ]
  // Encontra a primeira regra pendente para apresentar uma orientação objetiva.
  const pendente = requisitos.find((requisito) => !requisito.valido)
  // Retorna o estado completo para a lista visual e o envio do formulário.
  return { requisitos, valida: !pendente, erro: pendente?.erro || '' }
}
