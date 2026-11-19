function somenteDigitosCpf(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 11);
}

function cpfValido(valor) {
  const cpf = somenteDigitosCpf(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base, pesoInicial) => {
    const soma = base.split("").reduce((total, numero, indice) => total + Number(numero) * (pesoInicial - indice), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(cpf.slice(0, 9), 10) === Number(cpf[9]) && digito(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

module.exports = { somenteDigitosCpf, cpfValido };
