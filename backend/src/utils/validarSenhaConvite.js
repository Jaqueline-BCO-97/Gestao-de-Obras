// Valida os requisitos de senha somente quando um convite cria uma conta.
function validarSenhaConvite(senha) {
  // Trata entradas que não sejam texto como senha vazia para produzir erro claro.
  const valor = typeof senha === "string" ? senha : "";
  // Conta caracteres Unicode sem dividir pares substitutos em duas posições.
  const comprimentoValido = Array.from(valor).length >= 8;
  // Procura uma letra maiúscula Unicode em qualquer posição.
  const maiusculaValida = /\p{Lu}/u.test(valor);
  // Procura um algarismo Unicode em qualquer posição.
  const numeroValido = /\p{N}/u.test(valor);
  // Procura um caractere que não seja letra nem número.
  const especialValido = /[^\p{L}\p{N}]/u.test(valor);
  // Prioriza mensagens curtas para orientar a primeira regra ainda pendente.
  if (!comprimentoValido) return { valida: false, codigo: "SENHA_MINIMO", erro: "A senha deve ter pelo menos 8 caracteres." };
  // Informa quando falta uma letra maiúscula.
  if (!maiusculaValida) return { valida: false, codigo: "SENHA_MAIUSCULA", erro: "A senha deve conter pelo menos uma letra maiúscula." };
  // Informa quando falta um número.
  if (!numeroValido) return { valida: false, codigo: "SENHA_NUMERO", erro: "A senha deve conter pelo menos um número." };
  // Informa quando falta um caractere especial.
  if (!especialValido) return { valida: false, codigo: "SENHA_ESPECIAL", erro: "A senha deve conter pelo menos um caractere especial." };
  // Retorna sucesso quando todos os requisitos foram cumpridos.
  return { valida: true, codigo: null, erro: null };
}

// Exporta o validador para a rota de aceite e para os testes isolados.
module.exports = { validarSenhaConvite };
