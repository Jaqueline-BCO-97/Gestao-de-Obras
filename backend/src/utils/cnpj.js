function somenteDigitosCnpj(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 14);
}

function cnpjValido(valor) {
  const cnpj = somenteDigitosCnpj(valor);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digito = (base, pesos) => {
    const soma = [...base].reduce((total, numero, indice) => total + Number(numero) * pesos[indice], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const primeiro = digito(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = digito(cnpj.slice(0, 12) + primeiro, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return primeiro === Number(cnpj[12]) && segundo === Number(cnpj[13]);
}

module.exports = { somenteDigitosCnpj, cnpjValido };
