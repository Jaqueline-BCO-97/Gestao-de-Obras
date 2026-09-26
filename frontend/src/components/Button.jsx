export default function Button({ children, variant = 'primary', icon, ...props }) {
  const base = "px-5 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
  const variants = {
    primary: "bg-terracotta text-white hover:bg-terracotta-dark",
    outline: "border border-ink/20 text-ink hover:bg-ink/5",
  }

  return (
    <button className={`${base} ${variants[variant]}`} {...props}>
      {children}
      {icon && <span>{icon}</span>}
    </button>
  )
}