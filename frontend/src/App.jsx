import Perfil from './pages/Perfil/Perfil.jsx'

export default function App() {
  if (window.location.pathname !== '/perfil') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-navy">
        <h1 className="text-3xl font-bold tracking-tight">
          Obra<span className="text-primary">Master</span>
        </h1>
        <p className="text-ink/60">Acesse os dados da sua conta.</p>
        <a className="px-6 py-3 rounded-lg bg-navy text-white text-sm font-semibold" href="/perfil">
          Meu perfil
        </a>
      </div>
    )
  }
  return <Perfil />
}