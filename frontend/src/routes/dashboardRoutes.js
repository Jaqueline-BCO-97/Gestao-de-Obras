export const dashboardRoutes = {
  CLIENTE: { path: '/dashboard/cliente', titulo: 'Painel do cliente' },
  COLABORADOR: { path: '/dashboard/colaborador', titulo: 'Painel do colaborador' },
  ADMIN: { path: '/dashboard/admin', titulo: 'Painel administrativo' },
}

export function obterRotaDashboard(tipo) {
  return dashboardRoutes[tipo]?.path || null
}
