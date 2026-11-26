import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button.jsx'
import { listarCalendario, listarObras, reagendarObra } from '../services/auth.js'

const dataAgendada = (valor) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${String(valor).slice(0, 10)}T12:00:00.000Z`))

export default function AdminCalendario() {
  const [eventos, setEventos] = useState([])
  const [obras, setObras] = useState([])
  const [form, setForm] = useState({ obraId: '', agendadaPara: '', prazoFinal: '' })
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  function selecionarObra(obraId) {
    // Reusa as datas atuais para que obras iniciadas reenviem o mesmo início.
    const evento = eventos.find((item) => item.id === obraId)
    setForm({ obraId, agendadaPara: evento?.agendadaPara?.slice(0, 10) || '', prazoFinal: evento?.prazoFinal?.slice(0, 10) || '' })
  }
  async function carregar() { const [agenda, lista] = await Promise.all([listarCalendario(), listarObras()]); setEventos(agenda); setObras(lista) }
  useEffect(() => { let ativo = true; Promise.all([listarCalendario(), listarObras()]).then(([agenda, lista]) => { if (ativo) { setEventos(agenda); setObras(lista) } }).catch((falha) => { if (ativo) setErro(falha.message) }).finally(() => { if (ativo) setCarregando(false) }); return () => { ativo = false } }, [])
  async function salvar(event) { event.preventDefault(); setErro(''); setSucesso(''); setSalvando(true); try { await reagendarObra(form.obraId, form.agendadaPara, form.prazoFinal); await carregar(); setForm({ obraId: '', agendadaPara: '', prazoFinal: '' }); setSucesso('Agendamento salvo. A obra aparece em Próximas obras.') } catch (falha) { setErro(falha.message) } finally { setSalvando(false) } }
  const obraSelecionada = obras.find((obra) => obra.id === form.obraId)
  const inicioBloqueado = Boolean(obraSelecionada && !['Agendada', 'AGENDADA'].includes(obraSelecionada.status))
  return <main className="min-h-screen bg-background text-ink"><div className="mx-auto max-w-5xl space-y-6 px-4 py-8"><div><h1 className="text-3xl font-bold text-navy">Calendário de obras</h1><p className="mt-1 text-sm text-slate-600">Agende obras nas datas planejadas. A sobreposição de períodos é permitida.</p></div><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-navy">Agendar ou reagendar</h2><form onSubmit={salvar} className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-sm">Obra<select required value={form.obraId} onChange={(e) => selecionarObra(e.target.value)} className="mt-1 w-full rounded border p-2"><option value="">Selecione</option>{obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.titulo}</option>)}</select></label><label className="text-sm">Início<input required disabled={inicioBloqueado} type="date" value={form.agendadaPara} onChange={(e) => setForm({ ...form, agendadaPara: e.target.value })} className="mt-1 w-full rounded border p-2" /></label>{inicioBloqueado && <p className="text-xs text-slate-500">O início fica bloqueado depois que a obra começa.</p>}<label className="text-sm">Prazo final<input required type="date" value={form.prazoFinal} onChange={(e) => setForm({ ...form, prazoFinal: e.target.value })} className="mt-1 w-full rounded border p-2" /></label>{erro && <p role="alert" className="rounded bg-red-50 p-3 text-sm font-semibold text-red-800 sm:col-span-3">{erro}</p>}{sucesso && <p role="status" className="rounded bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 sm:col-span-3">{sucesso}</p>}<Button type="submit" disabled={salvando} className="sm:col-span-3">{salvando ? 'Salvando…' : 'Salvar agendamento'}</Button></form></section><section><h2 className="mb-3 font-bold text-navy">Próximas obras</h2>{carregando ? <p role="status">Carregando…</p> : eventos.length === 0 ? <p className="rounded border bg-white p-5 text-sm text-slate-500">Não há obras agendadas.</p> : <ol className="space-y-3">{eventos.map((obra) => <li key={obra.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link className="font-bold text-navy hover:underline" to={`/admin/obra/${encodeURIComponent(obra.id)}`}>{obra.nome}</Link><p className="mt-1 text-sm text-slate-600">{obra.cliente?.nome || 'Cliente ainda não vinculado'} · {obra.status}</p></div><span className="text-sm text-slate-700">{dataAgendada(obra.agendadaPara)}{obra.prazoFinal ? ` — ${dataAgendada(obra.prazoFinal)}` : ''}</span></div></li>)}</ol>}</section></div></main>
}
