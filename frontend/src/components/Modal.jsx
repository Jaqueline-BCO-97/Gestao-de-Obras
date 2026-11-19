/**
 * Modal simples com fundo escurecido, título e botão de fechar.
 * @param {string} title - título exibido no cabeçalho
 * @param {ReactNode} children - conteúdo do corpo do modal
 * @param {() => void} onClose - função chamada ao clicar no X
 * @param {boolean} open - controla se o modal está visível
 */

export default function Modal({ title, children, onClose, open, showHeader = true }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
        {showHeader && <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-lg">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-xl leading-none text-ink/40 hover:text-ink">×</button>
        </div>}
        <div>{children}</div>
      </div>
    </div>
  )
}
