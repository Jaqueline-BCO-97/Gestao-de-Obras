import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Button from '../components/Button.jsx'
import { excluirNotificacao, listarNotificacoes, marcarNotificacaoLida } from '../services/auth.js'

function tipoUsuario() { try { return JSON.parse(localStorage.getItem('usuario') || sessionStorage.getItem('usuario') || '{}').tipo } catch { return '' } }

export default function Notificacoes() {
  const [searchParams] = useSearchParams()
  const obraId = searchParams.get('obraId') || ''
  const tipo = tipoUsuario()
  const admin = tipo === 'ADMIN'
  const prefixo = tipo === 'CLIENTE' ? '/cliente/obra/' : tipo === 'COLABORADOR' ? '/colaborador/obra/' : '/admin/obra/'
  const [itens, setItens] = useState([])
  const [erroLista, setErroLista] = useState('')
  const [erroAcao, setErroAcao] = useState({})
  const [carregando, setCarregando] = useState(true)

  async function atualizar() { setItens(await listarNotificacoes(obraId)); setErroLista('') }
  useEffect(() => { let ativo = true; listarNotificacoes(obraId).then((lista) => { if (ativo) setItens(lista) }).catch((falha) => { if (ativo) setErroLista(falha.message) }).finally(() => { if (ativo) setCarregando(false) }); return () => { ativo = false } }, [obraId])

  async function marcar(id) { setErroAcao((atuais) => ({ ...atuais, [id]: '' })); try { await marcarNotificacaoLida(id); await atualizar() } catch (falha) { setErroAcao((atuais) => ({ ...atuais, [id]: falha.message })) } }
  async function remover(id) { setErroAcao((atuais) => ({ ...atuais, [id]: '' })); try { await excluirNotificacao(id); await atualizar() } catch (falha) { setErroAcao((atuais) => ({ ...atuais, [id]: falha.message })) } }
  const raiz = admin ? '/admin/obras' : tipo === 'CLIENTE' ? '/cliente' : '/colaborador'

  return <main className="mx-auto min-h-screen max-w-5xl space-y-5 bg-background px-4 py-8 text-ink">
    <Link to={raiz} className="text-sm font-semibold text-sky-700">← Voltar</Link>
    <div><p className="text-xs font-bold uppercase tracking-wider text-primary">Minha área</p><h1 className="mt-1 text-3xl font-bold text-navy">{obraId ? 'Notificações da obra' : 'Notificações'}</h1><p className="mt-1 text-sm text-slate-600">Atualizações da obra, mudanças no cronograma e alterações de equipe.</p></div>
    {carregando ? <p role="status">Carregando notificações…</p> : <section className="space-y-3">
      {erroLista && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{erroLista} <button type="button" className="underline" onClick={() => { setCarregando(true); atualizar().catch((falha) => setErroLista(falha.message)).finally(() => setCarregando(false)) }}>Tentar novamente</button></p>}
      {itens.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Você não tem notificações.</p> : itens.map((item) => <article key={item.id} className={`rounded-xl border p-4 shadow-sm ${item.lidaEm ? 'border-slate-200 bg-white' : 'border-sky-200 bg-sky-50'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-bold text-navy">{item.titulo}</h2>{item.obra && <p className="mt-0.5 text-xs font-semibold text-slate-600">Obra: {item.obra.nome}</p>}<p className="mt-2 text-sm text-slate-700">{item.descricao}</p><p className="mt-2 text-xs text-slate-500">{new Date(item.criadoEm).toLocaleString('pt-BR')}{item.lidaEm ? ' · Lida' : ' · Nova'}</p></div><div className="flex items-center gap-2">{item.obra && <Link to={`${prefixo}${encodeURIComponent(item.obra.id)}`} className="text-xs font-semibold text-sky-700 underline">Abrir obra</Link>}{!item.lidaEm && <Button variant="outline" onClick={() => marcar(item.id)} className="text-xs">Marcar como lida</Button>}{admin && <Button variant="outline" onClick={() => remover(item.id)} className="text-xs">Excluir</Button>}</div></div>{erroAcao[item.id] && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{erroAcao[item.id]}</p>}</article>)}
    </section>}
  </main>
}
