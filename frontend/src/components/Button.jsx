/**
 * Botão reutilizável do design system.
 * @param {"primary"|"outline"} variant - estilo visual (padrão: "primary")
 * @param {ReactNode} icon - ícone opcional exibido depois do texto
 * @param {ReactNode} children - texto/conteúdo do botão
 */

export default function Button({ children, variant = 'primary', icon, className = '', ...props }) {
  const base = "px-5 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-dark",
    outline: "border border-ink/20 text-ink hover:bg-ink/5",
  }

  return (
      <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
      {icon && <span>{icon}</span>}
    </button>
  )
}
