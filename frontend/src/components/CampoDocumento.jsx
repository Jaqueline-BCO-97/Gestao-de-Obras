// Importa o estado do React para mostrar a dica somente enquanto o campo está focado.
import { useId, useState } from 'react'
// Importa o texto comum de orientação para não repetir a redação nos campos.
import { TEXTO_TOOLTIP_DOCUMENTO } from '../utils/documento.js'

// Campo de texto reutilizável com dica acessível para documentos brasileiros.
export default function CampoDocumento({ onBlur, onFocus, ...props }) {
  // Guarda se o campo mantém o foco para controlar a dica visual.
  const [focado, setFocado] = useState(false)
  // Cria um identificador exclusivo para associar a dica ao input.
  const idTooltip = useId()

  // Mantém o input original e acrescenta a dica sem mudar sua formatação.
  return (
    <span className="relative block">
      {/* Mostra a orientação ao focar e preserva os handlers recebidos pela tela. */}
      <input
        {...props}
        aria-describedby={focado ? idTooltip : undefined}
        onFocus={(evento) => {
          setFocado(true)
          onFocus?.(evento)
        }}
        onBlur={(evento) => {
          setFocado(false)
          onBlur?.(evento)
        }}
      />
      {/* Expõe a orientação junto ao campo sem depender de bibliotecas adicionais. */}
      <span
        id={idTooltip}
        role="tooltip"
        hidden={!focado}
        className="absolute bottom-full left-0 z-10 mb-1 w-max max-w-[min(280px,80vw)] rounded border border-slate-200 bg-white px-2 py-1 text-xs font-normal text-slate-700 shadow-sm"
      >
        {TEXTO_TOOLTIP_DOCUMENTO}
      </span>
    </span>
  )
}
