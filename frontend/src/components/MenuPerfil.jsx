import { Link, useLocation, useNavigate } from 'react-router-dom'
import Avatar from './Avatar.jsx'
import { encerrarSessao } from '../services/auth.js'
import { obterFotoPerfil, obterUsuarioDaSessao } from '../utils/fotoPerfil.js'

const linksPorPerfil = {
  ADMIN: [
    ['/admin', 'Início', true], ['/admin/obras', 'Gestão de Obras'],
    ['/admin/funcionarios', 'Funcionários', true], ['/admin/funcionarios/gerentes', 'Gerentes'],
    ['/admin/clientes', 'Clientes'], ['/admin/precos', 'Preços'], ['/admin/calendario', 'Calendário'],
    ['/admin/pagamentos', 'Pagamentos'], ['/admin/notificacoes', 'Notificações'], ['/perfil', 'Perfil'],
  ],
  CLIENTE: [
    ['/cliente', 'Início', true], ['/cliente/pagamentos', 'Pagamentos'],
    ['/cliente/precos', 'Preços'], ['/cliente/contratos', 'Contratos'],
    ['/cliente/notificacoes', 'Notificações'], ['/perfil', 'Perfil'],
  ],
  COLABORADOR: [
    ['/colaborador', 'Início', true], ['/colaborador/notificacoes', 'Notificações'], ['/perfil', 'Perfil'],
  ],
}

export default function MenuPerfil() {
  const location = useLocation()
  const navigate = useNavigate()
  const usuario = obterUsuarioDaSessao()
  const linksIniciais = linksPorPerfil[usuario?.tipo] || []
  const links = usuario?.tipo === 'ADMIN' && location.pathname.startsWith('/admin/obra/')
    ? linksIniciais.filter(([to]) => to !== '/admin/funcionarios/gerentes')
    : linksIniciais

  return <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-5">
      <Link to={links[0]?.[0] || '/login'} className="shrink-0 text-base font-bold text-navy" aria-label="ObraMaster início">
        Obra<span className="text-primary">Master</span>
      </Link>
      <nav className="flex flex-1 flex-wrap items-center justify-end gap-1" aria-label="Menu principal">
        {links.map(([to, label, exato]) => {
          const ativo = location.pathname === to || (!exato && location.pathname.startsWith(`${to}/`))
          return <Link key={to} to={to} aria-current={ativo ? 'page' : undefined} className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${ativo ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-navy'}`}>
            {label}
          </Link>
        })}
        <Avatar nome={usuario?.nome} src={obterFotoPerfil(usuario)} className="h-8 w-8 border-slate-200" fallbackClassName="bg-sky-50 text-navy" />
        <button type="button" onClick={() => { encerrarSessao(); navigate('/login') }} className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Sair</button>
      </nav>
    </div>
  </header>
}
