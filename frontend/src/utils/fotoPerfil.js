const FOTOS_DEMO = {
  // Usa a foto de demonstração da administradora sem substituir uma foto enviada.
  'admin@obramaster.demo': '/foto-perfil/foto-admin.png',
  // Usa a foto de demonstração da cliente.
  'cliente@obramaster.demo': '/foto-perfil/foto-cliente.png',
  // Usa a foto de demonstração do gerente Carlos.
  'colaborador@obramaster.demo': '/foto-perfil/foto-colaborador1.png',
  // Usa a foto de demonstração do gerente Luciano.
  'colaborador2@obramaster.demo': '/foto-perfil/foto-colaborador2.png',
  // Usa a foto de demonstração do gerente Jhonatan.
  'colaborador3@obramaster.demo': '/foto-perfil/foto-colaborador3.png',
}

export function obterFotoPerfil(usuario) {
  // Dá prioridade a uma imagem que o próprio usuário salvou no perfil.
  if (usuario?.fotoUrl) return usuario.fotoUrl
  // Normaliza o e-mail para localizar somente contas demo conhecidas.
  const email = usuario?.email?.trim().toLocaleLowerCase('pt-BR')
  // Contas comuns sem foto salva não recebem uma imagem de demonstração.
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
