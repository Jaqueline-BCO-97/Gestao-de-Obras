// Importa o componente Navigate para redirecionamento e Outlet para rotas aninhadas do react-router-dom
import { Navigate, Outlet } from 'react-router-dom'
// Importa a função que verifica se o usuário possui sessão ou token ativo
import { estaAutenticado } from '../services/auth.js'
// Importa a função auxiliar que resolve a rota do dashboard de acordo com o perfil
import { obterRotaDashboard } from '../routes/dashboardRoutes.js'

// Função auxiliar interna para recuperar o usuário salvo no armazenamento do navegador
function obterUsuarioSessao() {
  // Lê a chave 'usuario' gravada no localStorage ou no sessionStorage
  const dados = localStorage.getItem('usuario') || sessionStorage.getItem('usuario')
  // Se não encontrar dados salvos, retorna null
  if (!dados) return null
  try {
    // Converte a string JSON de volta para objeto JavaScript
    return JSON.parse(dados)
  } catch {
    // Caso ocorra falha de parse no JSON, retorna null com segurança
    return null
  }
}

// Componente ProtectedRoute (Rota Protegida com controle de perfis permitidos)
// Tem a função de verificar se o usuário está logado e se seu perfil possui permissão para acessar a rota.
export default function ProtectedRoute({ children, perfisPermitidos }) {
  // Executa a verificação de autenticação (procura token ou sessão mock)
  const usuarioEstaAutenticado = estaAutenticado()

  // Se a verificação retornar falso (usuário não está logado)
  if (!usuarioEstaAutenticado) {
    // Redireciona para /login substituindo a rota no histórico para impedir retorno pelo botão "Voltar"
    return <Navigate to="/login" replace />
  }

  // Se a rota restringir o acesso a determinados perfis de usuário
  if (perfisPermitidos && perfisPermitidos.length > 0) {
    // Recupera os dados do usuário autenticado no navegador
    const usuario = obterUsuarioSessao()
    // Obtém o perfil/papel do usuário atual (ex: 'ADMIN', 'CLIENTE', 'COLABORADOR')
    const perfilUsuario = usuario?.tipo

    // Se o perfil do usuário não estiver na lista de perfis autorizados para esta rota
    if (!perfisPermitidos.includes(perfilUsuario)) {
      // Descobre a rota do dashboard correspondente ao perfil real do usuário logado
      const rotaDashboard = obterRotaDashboard(perfilUsuario) || '/login'
      // Redireciona o usuário para o dashboard do seu próprio perfil
      return <Navigate to={rotaDashboard} replace />
    }
  }

  // Se o componente recebeu elementos filhos (children) via propriedade, renderiza esses filhos
  if (children) {
    // Retorna os filhos protegidos
    return children
  }

  // Se não houver children direto, renderiza o Outlet (usado quando a rota protegida atua como layout de sub-rotas)
  return <Outlet />
}
