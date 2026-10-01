import Perfil from './pages/Perfil/Perfil.jsx'
import Login from './pages/Login.jsx'
import DashboardPlaceholder from './pages/DashboardPlaceholder.jsx'
import { dashboardRoutes } from './routes/dashboardRoutes.js'
import { obterToken } from './services/auth.js'

function RotaProtegida({ children }) {
  if (!obterToken()) {
    window.location.assign('/')
    return null
  }
  return children
}

export default function App() {
  const caminho = window.location.pathname

  if (caminho === '/perfil') return <RotaProtegida><Perfil /></RotaProtegida>

  const dashboard = Object.values(dashboardRoutes).find(({ path }) => path === caminho)
  if (dashboard) return <RotaProtegida><DashboardPlaceholder titulo={dashboard.titulo} /></RotaProtegida>

  return <Login />
}