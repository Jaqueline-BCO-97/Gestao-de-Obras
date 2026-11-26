// Importa a função que devolve a rota inicial de cada perfil de usuário.
import { obterRotaDashboard } from '../routes/dashboardRoutes.js'

// Define os links de navegação exibidos no menu superior para cada tipo de perfil.
// Cada item usa [caminho, rótulo, correspondenciaExata?, prefixoAtivoOpcional?].
const LINKS_POR_PERFIL = {
  // Links do administrador da empreiteira (sem o item textual "Perfil").
  ADMIN: [
    ['/admin', 'Início', true],
    ['/admin/obras', 'Gestão de Obras'],
    ['/admin/funcionarios', 'Funcionários', true],
    ['/admin/funcionarios/gerentes', 'Gerentes'],
    ['/admin/clientes', 'Clientes'],
    ['/admin/precos', 'Preços'],
    ['/admin/calendario', 'Calendário'],
    ['/admin/pagamentos', 'Pagamentos'],
    ['/admin/notificacoes', 'Notificações'],
  ],
  // Links do cliente que acompanha suas obras.
  CLIENTE: [
    ['/cliente', 'Início', true],
    ['/cliente/pagamentos', 'Pagamentos'],
    ['/cliente/precos', 'Preços'],
    ['/cliente/contratos', 'Contratos'],
    ['/cliente/notificacoes', 'Notificações'],
  ],
  // Links do gerente de obra (COLABORADOR), com "Início" e "Gestão de Obras" indo para /colaborador.
  COLABORADOR: [
    ['/colaborador', 'Início', true],
    ['/colaborador', 'Gestão de Obras', false, '/colaborador/obra/'],
    ['/colaborador/notificacoes', 'Notificações'],
  ],
}

// Retorna a rota inicial do perfil logado para o clique na logo.
export function obterRotaInicioMenu(tipo) {
  // Usa o mapeamento oficial de dashboards; se não houver perfil válido, vai para /login.
  return obterRotaDashboard(tipo) || '/login'
}

// Retorna a lista de links que deve aparecer no menu conforme o perfil e a rota atual.
export function obterLinksMenu(tipo, pathname = '') {
  // Busca a lista base do perfil informado ou retorna lista vazia se desconhecido.
  const linksIniciais = LINKS_POR_PERFIL[tipo] || []
  // Na tela de detalhe de obra do ADMIN, mantém a regra existente de ocultar o atalho "Gerentes".
  if (tipo === 'ADMIN' && pathname.startsWith('/admin/obra/')) {
    // Filtra apenas o item de gerentes quando o admin já está dentro de uma obra.
    return linksIniciais.filter(([to]) => to !== '/admin/funcionarios/gerentes')
  }
  // Para os demais casos, devolve todos os links configurados para o perfil.
  return linksIniciais
}

// Informa se um item do menu deve ficar destacado como página atual.
export function linkEstaAtivo(item, pathname = '') {
  // Desestrutura as posições do item configurado na lista do perfil.
  const [to, , exato, prefixoAtivo] = item
  // Se houver prefixo específico (caso de "Gestão de Obras" do gerente), ativa só dentro desse prefixo.
  if (prefixoAtivo) {
    // Destaca "Gestão de Obras" quando o gerente está em /colaborador/obra/:id.
    return pathname.startsWith(prefixoAtivo)
  }
  // Para correspondência exata, exige caminho idêntico; senão, aceita sub-rotas iniciadas pelo caminho.
  return pathname === to || (!exato && pathname.startsWith(`${to}/`))
}

// Retorna as classes estáticas de breakpoint para o Tailwind compilar corretamente.
export function obterClassesBreakpointMenu(tipo) {
  // ADMIN tem mais itens, então recolhe abaixo de 1280px (xl).
  if (tipo === 'ADMIN') {
    // Barra desktop aparece em xl (1280px+); controles compactos somem em xl.
    return {
      barraDesktop: 'hidden xl:flex',
      controlesRecolhidos: 'flex xl:hidden',
      painelRecolhido: 'xl:hidden',
    }
  }
  // CLIENTE e COLABORADOR têm menos itens, então recolhem abaixo de 1024px (lg).
  return {
    barraDesktop: 'hidden lg:flex',
    controlesRecolhidos: 'flex lg:hidden',
    painelRecolhido: 'lg:hidden',
  }
}
