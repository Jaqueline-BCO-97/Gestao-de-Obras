export function formatarTelefoneBR(valor) {
  const digitos = String(valor || '').replace(/\D/g, '').slice(0, 11)
  if (!digitos) return ''
  if (digitos.length < 2) return digitos
  const ddd = digitos.slice(0, 2)
  const local = digitos.slice(2)
  if (!local) return `(${ddd})`
  const tamanhoInicial = digitos.length === 11 ? 5 : 4
  if (local.length <= tamanhoInicial) return `(${ddd}) ${local}`
  return `(${ddd}) ${local.slice(0, tamanhoInicial)}-${local.slice(tamanhoInicial)}`
}
