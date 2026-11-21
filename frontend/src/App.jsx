// Importa os componentes principais de roteamento da biblioteca react-router-dom
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Importa o componente ProtectedRoute responsável por barrar usuários não logados
import ProtectedRoute from './components/ProtectedRoute.jsx'

// Importa o componente da tela de Login
const Login = lazy(() => import('./pages/Login.jsx'))
const Cliente = lazy(() => import('./pages/Cliente.jsx'))
const ClienteObra = lazy(() => import('./pages/ClienteObra.jsx'))
const ClienteAndamento = lazy(() => import('./pages/ClienteAndamento.jsx'))
const ClientePagamento = lazy(() => import('./pages/ClientePagamento.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))
const AdminObras = lazy(() => import('./pages/AdminObras.jsx'))
const Colaborador = lazy(() => import('./pages/Colaborador.jsx'))
const ColaboradorObra = lazy(() => import('./pages/ColaboradorObra.jsx'))
const Perfil = lazy(() => import('./pages/Perfil/Perfil.jsx'))
const RegistroEmpreiteira = lazy(() => import('./pages/RegistroEmpreiteira.jsx'))
const AceitarConvite = lazy(() => import('./pages/AceitarConvite.jsx'))
const AdminFuncionarios = lazy(() => import('./pages/AdminFuncionarios.jsx'))
const AdminClientes = lazy(() => import('./pages/AdminClientes.jsx'))
const AdminObra = lazy(() => import('./pages/AdminObra.jsx'))
const AdminPrecos = lazy(() => import('./pages/AdminPrecos.jsx'))
const AdminCalendario = lazy(() => import('./pages/AdminCalendario.jsx'))
const AdminGerentes = lazy(() => import('./pages/AdminGerentes.jsx'))
const AdminFuncionario = lazy(() => import('./pages/AdminFuncionario.jsx'))
const Notificacoes = lazy(() => import('./pages/Notificacoes.jsx'))
const Pagamentos = lazy(() => import('./pages/Pagamentos.jsx'))
const ClienteContratos = lazy(() => import('./pages/ClienteContratos.jsx'))
const ClientePrecos = lazy(() => import('./pages/ClientePrecos.jsx'))

// Componente raiz da aplicação (App) que define a estrutura de rotas do frontend
export default function App() {
  // Retorna a árvore de componentes com o provedor de roteamento e as rotas
  return (
    // O BrowserRouter gerencia o histórico de navegação baseado na URL do navegador
    <BrowserRouter>
      {/* O componente Routes agrupa as rotas e renderiza a primeira que coincidir com a URL atual */}
      <Suspense fallback={<main role="status" className="min-h-screen bg-background p-6"><div className="mx-auto max-w-5xl animate-pulse space-y-4"><div className="h-12 rounded-lg bg-white" /><div className="h-8 w-1/3 rounded bg-slate-200" /><div className="h-36 rounded-xl bg-white" /><div className="h-36 rounded-xl bg-white" /></div></main>}>
      <Routes>
        {/* Rota inicial (/): Redireciona automaticamente para a tela de login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Rota pública de login (/login): Não requer autenticação */}
        <Route path="/login" element={<Login />} />
        <Route path="/registro-empreiteira" element={<RegistroEmpreiteira />} />
        <Route path="/convite/:token" element={<AceitarConvite />} />

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

        {/* Histórico completo da obra do cliente, protegido pelo mesmo perfil. */}
        <Route
          path="/cliente/obra/:id/andamento"
          element={
            <ProtectedRoute perfisPermitidos={['CLIENTE']}>
              <ClienteAndamento />
            </ProtectedRoute>
          }
        />

        {/* Rota protegida do pagamento da obra, acessível somente ao perfil CLIENTE. */}
        <Route
          path="/cliente/obra/:id/pagamento"
          element={
            <ProtectedRoute perfisPermitidos={['CLIENTE']}>
              <ClientePagamento />
            </ProtectedRoute>
          }
        />
        <Route path="/cliente/pagamentos" element={<ProtectedRoute perfisPermitidos={['CLIENTE']}><Pagamentos /></ProtectedRoute>} />
        <Route path="/cliente/notificacoes" element={<ProtectedRoute perfisPermitidos={['CLIENTE']}><Notificacoes /></ProtectedRoute>} />
        <Route path="/cliente/contratos" element={<ProtectedRoute perfisPermitidos={['CLIENTE']}><ClienteContratos /></ProtectedRoute>} />
        <Route path="/cliente/precos" element={<ProtectedRoute perfisPermitidos={['CLIENTE']}><ClientePrecos /></ProtectedRoute>} />

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

        <Route
          path="/admin/funcionarios"
          element={
            <ProtectedRoute perfisPermitidos={['ADMIN']}>
              <AdminFuncionarios />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/funcionarios/gerentes" element={<ProtectedRoute perfisPermitidos={['ADMIN']}><AdminGerentes /></ProtectedRoute>} />
        <Route path="/admin/funcionarios/:id" element={<ProtectedRoute perfisPermitidos={['ADMIN']}><AdminFuncionario /></ProtectedRoute>} />

        <Route
          path="/admin/clientes"
          element={
            <ProtectedRoute perfisPermitidos={['ADMIN']}>
              <AdminClientes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/obra/:id"
          element={
            <ProtectedRoute perfisPermitidos={['ADMIN']}>
              <AdminObra />
            </ProtectedRoute>
          }
        />

        <Route path="/admin/precos" element={<ProtectedRoute perfisPermitidos={['ADMIN']}><AdminPrecos /></ProtectedRoute>} />
        <Route path="/admin/calendario" element={<ProtectedRoute perfisPermitidos={['ADMIN']}><AdminCalendario /></ProtectedRoute>} />
        <Route path="/admin/pagamentos" element={<ProtectedRoute perfisPermitidos={['ADMIN']}><Pagamentos /></ProtectedRoute>} />
        <Route path="/admin/notificacoes" element={<ProtectedRoute perfisPermitidos={['ADMIN']}><Notificacoes /></ProtectedRoute>} />

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
        <Route path="/colaborador/notificacoes" element={<ProtectedRoute perfisPermitidos={['COLABORADOR']}><Notificacoes /></ProtectedRoute>} />

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
      </Suspense>
    </BrowserRouter>
  )
}
