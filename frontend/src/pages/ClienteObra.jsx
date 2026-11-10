// Importa o hook useParams para ler parâmetros dinâmicos da URL e o Link para navegação
import { useParams, Link } from 'react-router-dom'

// Componente da página de Detalhes da Obra do Cliente (/cliente/obra/:id)
// Esta página é temporária e demonstra como acessar o identificador da obra passado na rota
export default function ClienteObra() {
  // O hook useParams extrai os parâmetros definidos na rota (neste caso, o ":id")
  const { id } = useParams()

  // Renderiza a estrutura visual da página de detalhes da obra
  return (
    // Contêiner principal centralizado com fundo claro
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7fa] p-6 text-slate-800">
      {/* Cartão de conteúdo central */}
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {/* Identificação da seção do sistema */}
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#087eae]">Área do Cliente</p>

        {/* Título principal da página temporária */}
        <h1 className="text-2xl font-bold text-[#0c2d43]">Detalhes da Obra</h1>

        {/* Exibição do parâmetro dinâmico capturado da URL */}
        <p className="mt-4 text-sm text-slate-600">
          Identificador da Obra (ID):{' '}
          {/* Destaca o valor do parâmetro id extraído da URL */}
          <span className="font-mono font-bold text-[#087eae]">{id}</span>
        </p>

        {/* Informação sobre a rota acessada */}
        <p className="mt-2 text-xs text-slate-400">
          Rota atual: <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700">/cliente/obra/{id}</code>
        </p>

        {/* Botão de retorno para o painel principal do cliente */}
        <div className="mt-6">
          <Link
            to="/cliente"
            className="inline-block rounded-lg bg-[#0c2d43] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10405a]"
          >
            ← Voltar para o Painel do Cliente
          </Link>
        </div>
      </div>
    </div>
  )
}
