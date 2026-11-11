// Importa os componentes principais de roteamento da biblioteca react-router-dom
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Importa o componente ProtectedRoute responsável por barrar usuários não logados
import ProtectedRoute from './components/ProtectedRoute.jsx'

// Importa o componente da tela de Login
import Login from './pages/Login.jsx'

// Importa a página temporária do painel do cliente
import Cliente from './pages/Cliente.jsx'

// Importa a página temporária de detalhes da obra com parâmetro :id
import ClienteObra from './pages/ClienteObra.jsx'

// Importa a página temporária do painel do administrador
import Admin from './pages/Admin.jsx'

// Importa a página temporária da listagem de obras do administrador
import AdminObras from './pages/AdminObras.jsx'

// Importa a página temporária do painel do colaborador
import Colaborador from './pages/Colaborador.jsx'

// Importa a página de registro de andamento da obra pelo colaborador
import ColaboradorObra from './pages/ColaboradorObra.jsx'

// Importa a página de Perfil para manter a funcionalidade já existente no sistema
import Perfil from './pages/Perfil/Perfil.jsx'

// Componente raiz da aplicação (App) que define a estrutura de rotas do frontend
export default function App() {
  // Retorna a árvore de componentes com o provedor de roteamento e as rotas
  return (
    // O BrowserRouter gerencia o histórico de navegação baseado na URL do navegador
    <BrowserRouter>
      {/* O componente Routes agrupa as rotas e renderiza a primeira que coincidir com a URL atual */}
      <Routes>
        {/* Rota inicial (/): Redireciona automaticamente para a tela de login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Rota pública de login (/login): Não requer autenticação */}
        <Route path="/login" element={<Login />} />

        {/* Rota protegida do painel do cliente (/cliente): Exige perfil CLIENTE */}
        <Route
          path="/cliente"
          element={
            <ProtectedRoute perfisPermitidos={['CLIENTE']}>
              <Cliente />
            </ProtectedRoute>
          }
        />

        {/* Rota protegida com parâmetro dinâmico (:id) para ver uma obra específica (/cliente/obra/:id): Exige perfil CLIENTE */}
        <Route
          path="/cliente/obra/:id"
          element={
            <ProtectedRoute perfisPermitidos={['CLIENTE']}>
              <ClienteObra />
            </ProtectedRoute>
          }
        />

        {/* Rota protegida do painel administrativo (/admin): Exige perfil ADMIN */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute perfisPermitidos={['ADMIN']}>
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* Rota protegida de gerenciamento de obras do administrador (/admin/obras): Exige perfil ADMIN */}
        <Route
          path="/admin/obras"
          element={
            <ProtectedRoute perfisPermitidos={['ADMIN']}>
              <AdminObras />
            </ProtectedRoute>
          }
        />

        {/* Rota protegida do painel do colaborador (/colaborador): Exige perfil COLABORADOR */}
        <Route
          path="/colaborador"
          element={
            <ProtectedRoute perfisPermitidos={['COLABORADOR']}>
              <Colaborador />
            </ProtectedRoute>
          }
        />

        {/* Rota protegida de registro de andamento da obra (/colaborador/obra/:id): Exige perfil COLABORADOR */}
        <Route
          path="/colaborador/obra/:id"
          element={
            <ProtectedRoute perfisPermitidos={['COLABORADOR']}>
              <ColaboradorObra />
            </ProtectedRoute>
          }
        />

        {/* Rota protegida de perfil (/perfil): Acesso permitido para todos os perfis autenticados */}
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Perfil />
            </ProtectedRoute>
          }
        />

        {/* Rota coringa (*): Qualquer caminho digitado que não exista redireciona para /login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
