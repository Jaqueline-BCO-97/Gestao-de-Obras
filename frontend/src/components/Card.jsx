export default function Card({ label, value, icon, accent = "border-navy" }) {
  return (
    <div className={`bg-white rounded-xl p-5 border-t-4 ${accent} shadow-sm`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-ink/5 rounded-lg p-2">{icon}</div>
        <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-ink">{value}</p>
    </div>
  )
}