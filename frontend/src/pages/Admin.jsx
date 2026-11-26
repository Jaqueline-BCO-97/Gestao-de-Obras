import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card.jsx'
import { listarObras } from '../services/auth.js'
import { formatarMoeda, obterCoresStatus } from '../data/obrasMock.js'
// Importa o componente padronizado de resumo de parcelas para os cartões do dashboard Admin.
import ResumoParcelas from '../components/ResumoParcelas.jsx'

export default function Admin() {
  const [obras, setObras] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    let ativo = true
    listarObras().then((dados) => { if (ativo) setObras(dados) }).catch((falha) => { if (ativo) setErro(falha.message || 'Não foi possível carregar as obras.') }).finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [])
  async function atualizar() {
    setCarregando(true); setErro('')
    try { setObras(await listarObras()) } catch (falha) { setErro(falha.message || 'Não foi possível carregar as obras.') }
    finally { setCarregando(false) }
  }

  const contagem = (valor) => obras.filter((obra) => obra.status === valor).length
  const aReceber = obras.reduce((total, obra) => total + [obra.parcela1, obra.parcela2].reduce((soma, parcela) => soma + (parcela?.situacao === 'pendente' ? Number(parcela.saldoDisponivel ?? parcela.valor ?? 0) : 0), 0), 0)

  return <div className="min-h-screen bg-background text-ink">

    <main className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-6">
      <section><p className="text-xs font-bold uppercase tracking-wider text-primary">Resumo da empresa</p><h1 className="mt-1 text-3xl font-bold text-navy">Início</h1><p className="mt-1 text-sm text-slate-600">Acompanhe as obras que sua empreiteira administra e compartilha com cada cliente.</p></section>
      {erro && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert"><p>{erro}</p><button onClick={atualizar} className="mt-2 font-semibold underline">Tentar novamente</button></div>}
      {carregando && <p role="status" className="rounded-xl bg-white p-5 text-sm text-slate-600">Carregando as obras da empresa…</p>}
      {!carregando && !erro && <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6" aria-label="Resumo de obras">
          <Card label="Total de obras" value={obras.length} accent="border-navy" />
          <Card label="Em andamento" value={contagem('Em andamento')} accent="border-amber-500" />
          <Card label="Aguardando conferência" value={contagem('Aguardando conferência')} accent="border-purple-500" />
          <Card label="Concluídas" value={contagem('Concluída')} accent="border-emerald-500" />
          <Card label="Agendadas" value={contagem('Agendada')} accent="border-sky-500" />
          <Card label="A receber" value={formatarMoeda(aReceber)} accent="border-primary" />
        </section>
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-navy">Obras da empreiteira ({obras.length})</h2><p className="text-sm text-slate-500">Os dados abaixo vêm da sua conta e do banco de dados.</p></div><Link to="/admin/obras" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">Gestão de Obras →</Link></div>
          {obras.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Ainda não há obras cadastradas. <Link className="font-semibold text-sky-700 underline" to="/admin/obras">Cadastre a primeira obra</Link>.</div> : <div className="grid gap-4 md:grid-cols-2">{obras.map((obra) => {
            const cores = obterCoresStatus(obra.status)
            return <article key={obra.id} className={`rounded-xl border border-slate-200 border-t-4 ${cores.borda} bg-white p-5 shadow-sm`}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-navy">{obra.titulo}</h3><p className="mt-1 text-xs text-slate-500">Cliente: {obra.cliente || 'Ainda não vinculado'}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${cores.badge}`}>{obra.status}</span></div><div className="mt-3 space-y-1 text-sm text-slate-600"><p>📍 {obra.endereco || 'Endereço não informado'}</p><p>📅 Prazo de entrega: {obra.prazo || 'Não informado'}</p></div>{/* Exibe o resumo de parcelas somente leitura nos cartões do Admin sem alterar o cálculo de aReceber */}<ResumoParcelas obra={obra} origem="resumo" compacto className="mt-4" /><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><div><span className="block text-[10px] font-semibold uppercase text-slate-400">Valor final</span><strong className="text-lg text-navy">{formatarMoeda(obra.valorTotal)}</strong></div><Link to={`/admin/obra/${encodeURIComponent(obra.id)}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Gerenciar →</Link></div></article>
          })}</div>}
        </section>
      </>}
    </main>
  </div>
}
