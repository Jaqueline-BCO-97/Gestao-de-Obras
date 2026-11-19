const FOTOS_DEMO = {
  'admin@obramaster.demo': '/foto-admin.png',
  'cliente@obramaster.demo': '/foto-cliente.png',
  'colaborador@obramaster.demo': '/foto-colaborador.png',
}

export function obterFotoPerfil(usuario) {
  if (usuario?.fotoUrl) return usuario.fotoUrl
  const email = usuario?.email?.trim().toLocaleLowerCase('pt-BR')
  return email ? FOTOS_DEMO[email] || '' : ''
}

export function obterUsuarioDaSessao() {
  try {
    const salvo = localStorage.getItem('usuario') || sessionStorage.getItem('usuario')
    return salvo ? JSON.parse(salvo) : null
  } catch {
    return null
  }
}
