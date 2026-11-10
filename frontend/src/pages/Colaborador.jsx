// Importa o hook useNavigate do react-router-dom para navegação
import { useNavigate } from 'react-router-dom'
// Importa a função de logout da autenticação
import { encerrarSessao } from '../services/auth.js'

// Componente da página do Colaborador (/colaborador)
// Serve como página temporária inicial com título para a rota do colaborador
export default function Colaborador() {
  // Hook para redirecionar programaticamente o usuário
  const navigate = useNavigate()

  // Função que desloga o usuário e o redireciona para a página de login
  function handleLogout() {
    // Limpa a sessão atual (token e usuário)
    encerrarSessao()
    // Redireciona o usuário para a página de login
    navigate('/login')
  }

  // Renderiza a estrutura da página
  return (
    // Contêiner principal centralizado na tela
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7fa] p-6 text-slate-800">
      {/* Cartão de conteúdo central */}
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {/* Identificação de seção do colaborador */}
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-600">Área da Equipe</p>

        {/* Título da rota solicitado */}
        <h1 className="text-2xl font-bold text-[#0c2d43]">Painel do Colaborador</h1>

        {/* Informação sobre a rota atual */}
        <p className="mt-3 text-sm text-slate-500">
          Esta é uma página temporária da rota <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700">/colaborador</code>.
        </p>

        {/* Ações da página */}
        <div className="mt-6 flex flex-col gap-3">
          {/* Botão de logout para testar redirecionamento */}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Sair da Conta (Logout)
          </button>
        </div>
      </div>
    </div>
  )
}
