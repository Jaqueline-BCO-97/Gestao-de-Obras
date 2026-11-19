export function somenteDigitosCpf(valor) {
  return String(valor || '').replace(/\D/g, '').slice(0, 11)
}

export function formatarCpf(valor) {
  const cpf = somenteDigitosCpf(valor)
  return cpf.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, '$1.$2.$3-$4')
}

export function cpfValido(valor) {
  const cpf = somenteDigitosCpf(valor)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digito = (base, peso) => {
    const soma = [...base].reduce((total, numero, indice) => total + Number(numero) * (peso - indice), 0)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(cpf.slice(0, 9), 10) === Number(cpf[9]) && digito(cpf.slice(0, 10), 11) === Number(cpf[10])
}
