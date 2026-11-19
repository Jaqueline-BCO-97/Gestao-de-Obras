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
import ClienteAndamento from './pages/ClienteAndamento.jsx'
// Importa a página temporária de pagamento final do cliente.
import ClientePagamento from './pages/ClientePagamento.jsx'

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
import RegistroEmpreiteira from './pages/RegistroEmpreiteira.jsx'
import AceitarConvite from './pages/AceitarConvite.jsx'
import AdminFuncionarios from './pages/AdminFuncionarios.jsx'
import AdminClientes from './pages/AdminClientes.jsx'
import AdminObra from './pages/AdminObra.jsx'
import AdminPrecos from './pages/AdminPrecos.jsx'
import AdminCalendario from './pages/AdminCalendario.jsx'
import AdminGerentes from './pages/AdminGerentes.jsx'
import AdminFuncionario from './pages/AdminFuncionario.jsx'
import Notificacoes from './pages/Notificacoes.jsx'
import Pagamentos from './pages/Pagamentos.jsx'
import ClienteContratos from './pages/ClienteContratos.jsx'

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
    </BrowserRouter>
  )
}
