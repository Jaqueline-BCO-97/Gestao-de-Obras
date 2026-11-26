// Importa a função pura que monta o resumo de parcelas sem parênteses e com até 2 linhas.
import { montarResumoParcelas } from '../utils/resumoParcelas.js'

// Retorna a classe de cor já existente no sistema para cada estado da parcela.
function classeCorEstado(estado) {
  // Verde existente para parcelas quitadas.
  if (estado === 'Pago') return 'text-emerald-700'
  // Vermelho existente para parcelas vencidas.
  if (estado === 'Atrasada') return 'text-red-700'
  // Amarelo/âmbar existente para parcelas em aberto dentro do prazo.
  return 'text-amber-700'
}

// Componente reutilizável para exibir o resumo "Parcelas" em telas de detalhe e cartões.
export default function ResumoParcelas({ obra, origem = 'auto', compacto = false, className = '' }) {
  // Calcula cabeçalho e linhas conforme a origem ("resumo" nos cartões ou "parcelas" nos detalhes).
  const resumo = montarResumoParcelas(obra, { origem })

  // Renderiza o bloco padronizado com título "Parcelas" e linha horizontal fininha entre as linhas.
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-slate-50 ${
        compacto ? 'p-3 text-xs' : 'p-3.5 text-sm'
      } ${className}`}
    >
      {/* Título fixo do bloco conforme especificado */}
      <p className="font-bold text-navy">Parcelas</p>

      {/* Cabeçalho sem parênteses (ex.: "12 parcelas de R$ 1.000,00" ou "... — ainda pendentes") */}
      <p className="mt-1 font-medium text-slate-700">{resumo.cabecalho}</p>

      {/* Exibe as linhas (sempre 2 linhas quando há alguma paga em obra com 2+ parcelas) */}
      {resumo.linhas.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-200 border-t border-slate-200">
          {resumo.linhas.map((linha) => (
            <li key={linha.numero} className="flex flex-wrap items-center justify-between gap-x-2 py-1.5 text-slate-700">
              <span>
                {linha.numero}ª parcela de {linha.valorFormatado} —{' '}
                <strong className={classeCorEstado(linha.estado)}>{linha.estado}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
