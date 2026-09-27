import Perfil from './pages/Perfil/Perfil.jsx'
import './App.css'

export default function App() {
  if (window.location.pathname !== '/perfil') {
    return <div className="entry-screen"><h1>Obra<span>Master</span></h1><p>Acesse os dados da sua conta.</p><a className="entry-link" href="/perfil">Meu perfil</a></div>
  }
  return <Perfil />
}
