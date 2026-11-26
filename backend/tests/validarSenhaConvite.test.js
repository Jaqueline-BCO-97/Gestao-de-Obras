// Usa o executor de testes nativo do Node.
const { test } = require("node:test");
// Usa as verificações nativas para manter os testes sem dependências adicionais.
const assert = require("node:assert/strict");
// Importa a mesma regra usada pela rota de aceite do convite.
const { validarSenhaConvite } = require("../src/utils/validarSenhaConvite");

// Confere que uma senha curta recebe uma mensagem própria em português.
test("rejeita senha com menos de oito caracteres", () => {
  // Mantém os demais tipos de caracteres para isolar a regra de tamanho.
  const resultado = validarSenhaConvite("A1@bcde");
  // Confirma o código específico de tamanho mínimo.
  assert.equal(resultado.codigo, "SENHA_MINIMO");
  // Confirma que o validador indica falha.
  assert.equal(resultado.valida, false);
});

// Confere que a letra maiúscula é obrigatória.
test("rejeita senha sem letra maiúscula", () => {
  // Mantém tamanho, número e caractere especial válidos.
  const resultado = validarSenhaConvite("senha123@");
  // Confirma o código específico da letra maiúscula.
  assert.equal(resultado.codigo, "SENHA_MAIUSCULA");
});

// Confere que ao menos um número é obrigatório.
test("rejeita senha sem número", () => {
  // Mantém tamanho, maiúscula e caractere especial válidos.
  const resultado = validarSenhaConvite("Senhaabc@");
  // Confirma o código específico de número.
  assert.equal(resultado.codigo, "SENHA_NUMERO");
});

// Confere que ao menos um caractere que não seja letra ou número é obrigatório.
test("rejeita senha sem caractere especial", () => {
  // Mantém tamanho, maiúscula e número válidos.
  const resultado = validarSenhaConvite("Senha1234");
  // Confirma o código específico de caractere especial.
  assert.equal(resultado.codigo, "SENHA_ESPECIAL");
});

// Confere uma senha válida e a senha Demo@12345 das contas de demonstração.
test("aceita senha com todos os requisitos, incluindo Demo@12345", () => {
  // Confirma que uma senha de demonstração atende ao mínimo e aos tipos exigidos.
  assert.deepEqual(validarSenhaConvite("Demo@12345"), { valida: true, codigo: null, erro: null });
  // Confirma também uma senha alternativa válida.
  assert.equal(validarSenhaConvite("Senha-segura-123").valida, true);
});
