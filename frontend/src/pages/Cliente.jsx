// Importa o componente Link do react-router-dom para criar links internos sem recarregar a página
import { Link, useNavigate } from 'react-router-dom'
// Importa a função de encerrar sessão para permitir logout
import { encerrarSessao } from '../services/auth.js'

// Componente da página do Cliente (/cliente)
// Atualmente serve como página temporária inicial com título e navegação básica
export default function Cliente() {
  // Hook do react-router-dom que permite navegar programaticamente entre as rotas
  const navigate = useNavigate()

  // Função que executa o logout do usuário e o redireciona para a tela de login
  function handleLogout() {
    // Limpa o token e os dados salvos da sessão
    encerrarSessao()
    // Redireciona para a página de login
    navigate('/login')
  }

  // Renderiza a estrutura visual da página
  return (
    // Contêiner principal centralizado com fundo claro
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7fa] p-6 text-slate-800">
      {/* Cartão de conteúdo com borda e sombra suave */}
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {/* Subtítulo indicando a seção do sistema */}
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#087eae]">Área do Cliente</p>

        {/* Título principal da página solicitado na issue */}
        <h1 className="text-2xl font-bold text-[#0c2d43]">Painel do Cliente</h1>

        {/* Texto descritivo informando que a página é temporária */}
        <p className="mt-3 text-sm text-slate-500">
          Esta é uma página temporária da rota <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700">/cliente</code>.
        </p>

        {/* Bloco de navegação para testar as outras rotas do cliente */}
        <div className="mt-6 flex flex-col gap-3">
          {/* Link para navegar até os detalhes de uma obra exemplo com parâmetro :id */}
          <Link
            to="/cliente/obra/1"
            className="rounded-lg bg-[#087eae] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#06658c]"
          >
            Ver Detalhe da Obra #1
          </Link>

          {/* Botão para encerrar a sessão e testar a proteção de rotas */}
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
