const test = require("node:test");
const assert = require("node:assert/strict");
const { cnpjValido, somenteDigitosCnpj } = require("../src/utils/cnpj");

test("valida dígitos verificadores de CNPJ e remove pontuação", () => {
  assert.equal(cnpjValido("11.222.333/0001-81"), true);
  assert.equal(somenteDigitosCnpj("11.222.333/0001-81"), "11222333000181");
  assert.equal(cnpjValido("11.222.333/0001-80"), false);
  assert.equal(cnpjValido("00.000.000/0000-00"), false);
});
