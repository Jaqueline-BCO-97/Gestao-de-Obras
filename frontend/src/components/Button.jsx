/**
 * Botão reutilizável do design system.
 * @param {"primary"|"outline"|"compact"} variant - estilo visual (padrão: "primary")
 * @param {ReactNode} icon - ícone opcional exibido depois do texto
 * @param {ReactNode} children - texto/conteúdo do botão
 */

export default function Button({ children, variant = 'primary', icon, className = '', ...props }) {
  const base = "rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
  const variants = {
    primary: "px-5 py-3 text-sm bg-primary text-white hover:bg-primary-dark",
    outline: "px-5 py-3 text-sm border border-ink/20 text-ink hover:bg-ink/5",
    compact: "px-3.5 py-2 text-xs bg-navy text-white hover:bg-navy/90",
  }

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
      {icon && <span>{icon}</span>}
    </button>
  )
}