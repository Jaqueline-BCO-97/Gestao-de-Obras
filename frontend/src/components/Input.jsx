export default function Input({ label, icon, type = "text", ...props }) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-ink mb-1.5">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2 border border-ink/15 rounded-lg px-3 py-3 bg-white focus-within:border-terracotta">
        {icon && <span className="text-ink/40">{icon}</span>}
        <input
          type={type}
          className="w-full outline-none text-sm bg-transparent placeholder:text-ink/30"
          {...props}
        />
      </div>
    </div>
  )
}