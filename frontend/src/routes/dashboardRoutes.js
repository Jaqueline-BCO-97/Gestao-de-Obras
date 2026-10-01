export const dashboardRoutes = {
  CLIENTE: { path: '/perfil', titulo: 'Meu perfil' },
  COLABORADOR: { path: '/dashboard/colaborador', titulo: 'Painel do colaborador' },
  ADMIN: { path: '/perfil', titulo: 'Meu perfil' },
}

export function obterRotaDashboard(tipo) {
  return dashboardRoutes[tipo]?.path || null
}
