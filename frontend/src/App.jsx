import Perfil from './pages/Perfil/Perfil.jsx'
import Login from './pages/Login.jsx'
import DashboardPlaceholder from './pages/DashboardPlaceholder.jsx'
import { dashboardRoutes } from './routes/dashboardRoutes.js'

export default function App() {
  const caminho = window.location.pathname

  if (caminho === '/perfil') return <Perfil />

  const dashboard = Object.values(dashboardRoutes).find(({ path }) => path === caminho)
  if (dashboard) return <DashboardPlaceholder titulo={dashboard.titulo} />

  return <Login />
}
