// Objeto que mapeia cada tipo de usuário para o seu painel de destino inicial e título
export const dashboardRoutes = {
  // Configuração para usuários do tipo CLIENTE
  CLIENTE: {
    // Caminho da rota principal do painel do cliente
    path: '/cliente',
    // Título exibido na página do cliente
    titulo: 'Painel do Cliente',
  },
  // Configuração para usuários do tipo COLABORADOR
  COLABORADOR: {
    // Caminho da rota principal do painel do colaborador
    path: '/colaborador',
    // Título exibido na página do colaborador
    titulo: 'Painel do Colaborador',
  },
  // Configuração para usuários do tipo ADMIN (Administrador do sistema)
  ADMIN: {
    // Caminho da rota principal do painel de administração
    path: '/admin',
    // Título exibido na página do administrador
    titulo: 'Painel do Administrador',
  },
}

// Dicionário com todas as rotas da aplicação para evitar strings mágicas espalhadas pelo código
export const ROTAS = {
  // Rota pública de autenticação
  LOGIN: '/login',
  // Rota do painel do cliente
  CLIENTE: '/cliente',
  // Rota com parâmetro dinâmico (:id) para ver os detalhes de uma obra do cliente
  CLIENTE_OBRA: '/cliente/obra/:id',
  // Rota do painel principal do administrador
  ADMIN: '/admin',
  // Rota de listagem e gerenciamento de obras pelo administrador
  ADMIN_OBRAS: '/admin/obras',
  // Rota do painel do colaborador
  COLABORADOR: '/colaborador',
  // Rota com parâmetro dinâmico (:id) para registrar andamento de obra pelo colaborador
  COLABORADOR_OBRA: '/colaborador/obra/:id',
  // Rota para visualização e edição de perfil da conta
  PERFIL: '/perfil',
}

// Função que recebe o tipo do usuário (ex: 'CLIENTE', 'ADMIN') e retorna o caminho da rota correspondente
export function obterRotaDashboard(tipo) {
  // Retorna o caminho da rota se o tipo existir no mapa, ou null se não for encontrado
  return dashboardRoutes[tipo]?.path || null
}
