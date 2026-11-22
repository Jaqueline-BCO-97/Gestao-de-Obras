const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { cpfValido, somenteDigitosCpf } = require("../src/utils/cpf");

describe("validação de CPF do perfil", () => {
  it("aceita CPF válido formatado ou sem máscara", () => {
    assert.equal(cpfValido("529.982.247-25"), true);
    assert.equal(cpfValido("52998224725"), true);
    assert.equal(somenteDigitosCpf("529.982.247-25"), "52998224725");
  });

  it("recusa sequências repetidas e dígitos verificadores inválidos", () => {
    assert.equal(cpfValido("111.111.111-11"), false);
    assert.equal(cpfValido("529.982.247-24"), false);
    assert.equal(cpfValido("123"), false);
  });

  it("aceita CPF demo definido para a conta de cliente", () => {
    assert.equal(cpfValido("529.982.247-25"), true);
  });
});
