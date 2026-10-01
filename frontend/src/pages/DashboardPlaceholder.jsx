import { encerrarSessao } from '../services/auth.js'

export default function DashboardPlaceholder({ titulo }) {
  function sair() {
    encerrarSessao()
    window.location.assign('/')
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-ink">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">ObraMaster</p>
        <h1 className="text-2xl font-bold text-navy">{titulo}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Seu acesso foi validado. Este painel será disponibilizado em uma próxima etapa.</p>
        <button type="button" onClick={sair} className="mt-6 rounded-lg bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy/90">
          Sair da conta
        </button>
      </section>
    </main>
  )
}
