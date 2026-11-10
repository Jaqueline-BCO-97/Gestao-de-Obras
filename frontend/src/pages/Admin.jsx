// Importa os componentes de navegação do react-router-dom
import { Link, useNavigate } from 'react-router-dom'
// Importa a função de logout para limpar a sessão ativa
import { encerrarSessao } from '../services/auth.js'

// Componente da página do Administrador (/admin)
// Serve como página temporária inicial do painel de administração
export default function Admin() {
  // Hook que permite navegação programática
  const navigate = useNavigate()

  // Função que executa o logout do administrador
  function handleLogout() {
    // Apaga os dados de autenticação armazenados
    encerrarSessao()
    // Redireciona para o login
    navigate('/login')
  }

  // Renderiza o conteúdo visual da página
  return (
    // Contêiner principal com alinhamento ao centro e fundo cinza suave
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7fa] p-6 text-slate-800">
      {/* Caixa central com borda arredondada e sombra */}
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {/* Identificação de seção de administração */}
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-600">Painel Administrativo</p>

        {/* Título da rota solicitado */}
        <h1 className="text-2xl font-bold text-[#0c2d43]">Painel do Administrador</h1>

        {/* Descrição temporária */}
        <p className="mt-3 text-sm text-slate-500">
          Esta é uma página temporária da rota <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700">/admin</code>.
        </p>

        {/* Lista de ações e navegação para administradores */}
        <div className="mt-6 flex flex-col gap-3">
          {/* Link para acessar o gerenciamento de obras do administrador */}
          <Link
            to="/admin/obras"
            className="rounded-lg bg-[#0c2d43] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10405a]"
          >
            Gerenciar Obras (/admin/obras)
          </Link>

          {/* Botão de logout para testar redirecionamento de rota protegida */}
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
