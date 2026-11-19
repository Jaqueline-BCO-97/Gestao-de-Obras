import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import { confirmarPrimeiraParcela, enviarComprovante, listarPagamentos } from '../services/auth.js'

function perfil() { try { return JSON.parse(localStorage.getItem('usuario') || sessionStorage.getItem('usuario') || '{}').tipo } catch { return '' } }
function moeda(valor) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0)) }
function atrasada(parcela) { return parcela.situacao !== 'PAGA' && parcela.vencimento && new Date(parcela.vencimento) < new Date() }

export default function Pagamentos() {
  const tipo = perfil()
  const admin = tipo === 'ADMIN'
  const [obras, setObras] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState('')
  const navigate = useNavigate()
  async function atualizar() { setObras(await listarPagamentos()) }
  useEffect(() => { let ativo = true; listarPagamentos().then((lista) => { if (ativo) setObras(lista) }).catch((falha) => { if (ativo) setErro(falha.message) }).finally(() => { if (ativo) setCarregando(false) }); return () => { ativo = false } }, [])

  async function anexar(obra, parcela, arquivo) {
    if (!arquivo) return
    setErro('')
    const limite = arquivo.type === 'application/pdf' ? 10 * 1024 * 1024 : 5 * 1024 * 1024
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type) || arquivo.size > limite) { setErro('Envie um PDF de até 10 MB ou uma foto JPG, PNG ou WebP de até 5 MB.'); return }
    setProcessando(parcela.id)
    try {
      const dados = await new Promise((resolve, reject) => { const leitor = new FileReader(); leitor.onload = () => resolve({ data: leitor.result, mimeType: arquivo.type }); leitor.onerror = () => reject(new Error('Não foi possível ler o comprovante.')); leitor.readAsDataURL(arquivo) })
      await enviarComprovante(obra.id, parcela.id, dados); await atualizar()
    } catch (falha) { setErro(falha.message) }
    finally { setProcessando('') }
  }

  async function confirmar(obra) {
    if (!window.confirm(`Confirmar que a primeira parcela da obra “${obra.nome}” foi recebida?`)) return
    setProcessando(obra.id); setErro('')
    try { await confirmarPrimeiraParcela(obra.id); await atualizar() }
    catch (falha) { setErro(falha.message) }
    finally { setProcessando('') }
  }

  const raiz = admin ? '/admin/obras' : '/cliente'
  return <main className="mx-auto min-h-screen max-w-5xl space-y-5 bg-background px-4 py-8 text-ink"><Link to={raiz} className="text-sm font-semibold text-sky-700">← Voltar</Link><div><p className="text-xs font-bold uppercase tracking-wider text-primary">Financeiro</p><h1 className="mt-1 text-3xl font-bold text-navy">{admin ? 'Pagamentos das obras' : 'Meus pagamentos'}</h1><p className="mt-1 text-sm text-slate-600">Parcelas, vencimentos e comprovantes organizados por obra.</p></div>{erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}{carregando ? <p role="status">Carregando pagamentos…</p> : obras.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Nenhum pagamento encontrado.</p> : <section className="space-y-4">{obras.map((obra) => <article key={obra.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-navy">{obra.nome}</h2><p className="text-sm text-slate-600">Valor total: <strong>{moeda(obra.valorTotal)}</strong> · Contrato fechado com divisão em ({obra.parcelas.length}) etapas</p></div>{!admin && <Link to={`/cliente/obra/${encodeURIComponent(obra.id)}`} className="text-sm font-semibold text-sky-700 underline">Abrir obra</Link>}</div><div className="mt-4 space-y-3">{obra.parcelas.map((parcela) => { const isAtrasada = atrasada(parcela); return <div key={parcela.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-navy">{parcela.numero}ª parcela · {moeda(parcela.valor)}</h3><p className="text-xs text-slate-600">Vencimento: {parcela.vencimento ? new Date(parcela.vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'A definir'} · <strong className={parcela.situacao === 'PAGA' ? 'text-emerald-700' : isAtrasada ? 'text-red-700' : 'text-amber-700'}>{parcela.situacao === 'PAGA' ? 'Paga' : isAtrasada ? 'Atrasada' : 'Pendente'}</strong></p></div>{!admin && parcela.situacao !== 'PAGA' && <Button variant="outline" onClick={() => navigate(`/cliente/obra/${encodeURIComponent(obra.id)}/pagamento`)} className="text-xs">Pagar online</Button>}</div>{parcela.comprovanteUrl && <p className="mt-2 text-xs"><a href={parcela.comprovanteUrl} target="_blank" rel="noreferrer" className="font-semibold text-sky-700 underline">Abrir comprovante enviado</a>{parcela.comprovanteEnviadoEm && ` · enviado em ${new Date(parcela.comprovanteEnviadoEm).toLocaleDateString('pt-BR')}`}</p>}{admin && parcela.numero === 1 && parcela.situacao !== 'PAGA' && <Button disabled={Boolean(processando)} variant="outline" onClick={() => confirmar(obra)} className="mt-3 text-xs">{processando === obra.id ? 'Confirmando…' : 'Confirmar 1ª parcela recebida'}</Button>}{!admin && parcela.situacao !== 'PAGA' && <label className="mt-3 block text-xs font-semibold text-slate-700">Enviar comprovante desta parcela (PDF ou foto)<input disabled={Boolean(processando)} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => anexar(obra, parcela, e.target.files?.[0])} className="mt-1 block w-full rounded border border-slate-300 bg-white p-2 font-normal" />{processando === parcela.id && <span role="status" className="mt-1 block text-sky-700">Enviando…</span>}</label>}</div> })}</div></article>)}</section>}</main>
}
