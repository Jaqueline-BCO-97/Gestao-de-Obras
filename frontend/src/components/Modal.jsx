export default function Modal({ title, children, onClose, open }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="text-ink/40 hover:text-ink text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}