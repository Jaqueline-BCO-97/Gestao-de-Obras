import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button.jsx'
import HistoricoObra from '../components/HistoricoObra.jsx'
import { buscarObra } from '../services/auth.js'

export default function ClienteAndamento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [obra, setObra] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    buscarObra(id)
      .then((resultado) => { if (ativo) setObra(resultado) })
      .catch((falha) => { if (ativo) setErro(falha.message || 'Não foi possível carregar o andamento.') })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [id])

  if (carregando) return <main className="min-h-screen p-8 text-center text-sm text-slate-600" role="status">Carregando o andamento da obra…</main>

  if (erro || !obra) {
    return (
      <main className="min-h-screen bg-background p-6 flex items-center justify-center">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="mb-2 text-xl font-bold text-navy">Andamento não encontrado</h1>
          <p className="mb-6 text-sm text-slate-600">{erro || 'Esta obra não existe ou não está disponível para sua conta.'}</p>
          <Button variant="primary" onClick={() => navigate('/cliente')}>Voltar para Minhas Obras</Button>
        </section>
      </main>
    )
  }

  const eventos = obra.timeline || []
  const fotos = eventos.filter((evento) => evento.fotoUrl)

  return (
    <div className="min-h-screen bg-background text-ink">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
          <Button variant="outline" onClick={() => navigate(`/cliente/obra/${encodeURIComponent(id)}`)}>← Voltar para a obra</Button>
          <div><p className="text-xs text-slate-500">Andamento da obra</p><h1 className="font-bold text-navy">{obra.titulo}</h1></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section aria-label="Fotos da obra" className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-bold text-navy">Fotos da obra</h2>
          {fotos.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fotos.map((evento) => <img key={evento.id} src={evento.fotoUrl} alt={`Foto do andamento: ${evento.descricao}`} loading="lazy" referrerPolicy="no-referrer" className="max-h-72 w-full rounded-lg object-cover" />)}
            </div>
          ) : <p className="text-sm text-slate-500">Ainda não há fotos registradas nesta obra.</p>}
        </section>
        <HistoricoObra eventos={eventos} perfil="CLIENTE" />
      </main>
    </div>
  )
}
