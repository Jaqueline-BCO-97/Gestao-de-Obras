import { Link, useLocation, useNavigate } from 'react-router-dom'
import { encerrarSessao } from '../services/auth.js'
import Avatar from './Avatar.jsx'
import { obterFotoPerfil, obterUsuarioDaSessao } from '../utils/fotoPerfil.js'

const links = [
  { to: '/admin', label: 'Início', end: true },
  { to: '/admin/obras', label: 'Gestão de Obras' },
  { to: '/admin/funcionarios', label: 'Funcionários', end: true },
  { to: '/admin/funcionarios/gerentes', label: 'Gerentes' },
  { to: '/admin/clientes', label: 'Clientes' },
  { to: '/admin/precos', label: 'Preços' },
  { to: '/admin/calendario', label: 'Calendário' },
  { to: '/admin/pagamentos', label: 'Pagamentos' },
  { to: '/admin/notificacoes', label: 'Notificações' },
  { to: '/perfil', label: 'Perfil' },
]

export default function AdminMenu() {
  const location = useLocation()
  const navigate = useNavigate()
  const usuario = obterUsuarioDaSessao()
  return <nav className="flex flex-wrap items-center gap-1.5 text-xs font-semibold" aria-label="Menu principal da empreiteira">
    {links.map(({ to, label, end }) => {
      const detalheDaObra = to === '/admin/obras' && location.pathname.startsWith('/admin/obra/')
      const ativo = detalheDaObra || (end ? location.pathname === to : location.pathname === to || location.pathname.startsWith(`${to}/`))
      return <Link key={to} to={to} aria-current={ativo ? 'page' : undefined} className={`rounded-md px-2.5 py-2 transition ${ativo ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-navy'}`}>{label}</Link>
    })}
    <Avatar nome={usuario?.nome} src={obterFotoPerfil(usuario)} className="h-8 w-8 border-slate-200" fallbackClassName="bg-sky-50 text-navy" />
    <button type="button" onClick={() => { encerrarSessao(); navigate('/login') }} className="rounded-md border border-slate-300 px-2.5 py-2 text-slate-700 hover:bg-slate-50">Sair</button>
  </nav>
}
