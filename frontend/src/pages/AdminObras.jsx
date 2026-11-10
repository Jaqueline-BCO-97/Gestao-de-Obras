// Importa o componente Link do react-router-dom para navegação interna
import { Link } from 'react-router-dom'

// Componente da página de Gestão de Obras do Administrador (/admin/obras)
// Serve como página temporária inicial com título para a rota de obras do admin
export default function AdminObras() {
  // Renderiza o conteúdo visual da página
  return (
    // Contêiner principal centralizado com fundo claro
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7fa] p-6 text-slate-800">
      {/* Cartão de conteúdo central */}
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {/* Identificador de seção administrativa */}
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-600">Painel Administrativo</p>

        {/* Título da rota */}
        <h1 className="text-2xl font-bold text-[#0c2d43]">Gestão de Obras</h1>

        {/* Informação sobre a rota atual */}
        <p className="mt-3 text-sm text-slate-500">
          Esta é uma página temporária da rota <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700">/admin/obras</code>.
        </p>

        {/* Botão de retorno para o painel principal do administrador */}
        <div className="mt-6">
          <Link
            to="/admin"
            className="inline-block rounded-lg bg-[#0c2d43] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10405a]"
          >
            ← Voltar para o Painel do Administrador
          </Link>
        </div>
      </div>
    </div>
  )
}
