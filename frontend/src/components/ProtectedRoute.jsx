// Importa o componente Navigate para redirecionamento e Outlet para rotas aninhadas do react-router-dom
import { Navigate, Outlet } from 'react-router-dom'
// Importa a função que verifica se o usuário possui sessão ou token ativo
import { estaAutenticado } from '../services/auth.js'

// Componente ProtectedRoute (Rota Protegida)
// Tem a função de verificar se o usuário está logado antes de exibir uma página restrita.
// Caso não esteja autenticado, redireciona o usuário imediatamente para a tela de login (/login).
export default function ProtectedRoute({ children }) {
  // Executa a verificação de autenticação (procura token ou sessão mock)
  const usuarioEstaAutenticado = estaAutenticado()

  // Se a verificação retornar falso (usuário não está logado)
  if (!usuarioEstaAutenticado) {
    // Redireciona para /login substituindo a rota no histórico para impedir retorno pelo botão "Voltar"
    return <Navigate to="/login" replace />
  }

  // Se o componente recebeu elementos filhos (children) via propriedade, renderiza esses filhos
  if (children) {
    // Retorna os filhos protegidos
    return children
  }

  // Se não houver children direto, renderiza o Outlet (usado quando a rota protegida atua como layout de sub-rotas)
  return <Outlet />
}
