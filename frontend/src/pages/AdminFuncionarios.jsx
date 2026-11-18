import AdminMenu from '../components/AdminMenu.jsx'
import { useCallback, useEffect, useState } from 'react'
import Button from '../components/Button.jsx'
import { encerrarEscala, convidarPessoa, listarFuncionarios, listarObras } from '../services/auth.js'

export default function AdminFuncionarios() {
  const [funcionarios, setFuncionarios] = useState([])
  const [obras, setObras] = useState([])
  const [form, setForm] = useState({ obraId: '', nome: '', email: '', telefone: '', funcao: 'Gerente de obras' })
  const [link, setLink] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState('')

  const atualizar = useCallback(async () => {
    const [listaFuncionarios, listaObras] = await Promise.all([listarFuncionarios(), listarObras()])
    setFuncionarios(listaFuncionarios)
    setObras(listaObras)
  }, [])

  useEffect(() => {
    let ativo = true
    Promise.all([listarFuncionarios(), listarObras()])
      .then(([listaFuncionarios, listaObras]) => {
        if (ativo) { setFuncionarios(listaFuncionarios); setObras(listaObras) }
      })
      .catch((falha) => { if (ativo) setErro(falha.message) })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [])

  async function convidar(event) {
    event.preventDefault(); setErro(''); setLink(''); setProcessando('convite')
    try {
      const resposta = await convidarPessoa('gerente', form)
      setLink(resposta.convite.link)
      setForm({ ...form, nome: '', email: '', telefone: '' })
    } catch (falha) { setErro(falha.message) }
    finally { setProcessando('') }
  }

  async function removerAcesso(escala, nomeFuncionario) {
    if (!window.confirm(`Remover ${nomeFuncionario} desta obra? O histórico da escala será mantido.`)) return
    setErro(''); setProcessando(escala.id)
    try { await encerrarEscala(escala.obra.id, escala.id, 'Acesso encerrado pela empreiteira'); await atualizar() }
    catch (falha) { setErro(falha.message) }
    finally { setProcessando('') }
  }

  return <div className="min-h-screen bg-background text-ink">
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3"><div><strong className="text-lg text-navy">Obra<span className="text-primary">Master</span></strong><p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Empreiteira</p></div><AdminMenu /></div></header>
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div><h1 className="text-3xl font-bold text-navy">Gerentes de obra</h1><p className="mt-1 text-sm text-slate-600">Convide responsáveis e acompanhe as obras às quais cada pessoa tem acesso.</p></div>
      {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Convidar gerente</h2><p className="mt-1 text-sm text-slate-600">O convite dá acesso somente à obra selecionada. Depois de aceitar, o gerente poderá registrar o andamento daquela obra.</p>
        <form onSubmit={convidar} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm">Obra<select required value={form.obraId} onChange={(e) => setForm({ ...form, obraId: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2"><option value="">Selecione uma obra</option>{obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.titulo}</option>)}</select></label><label className="text-sm">Nome completo<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">E-mail<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Telefone<input type="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Função<input required value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><Button disabled={processando === 'convite' || !obras.length} type="submit" className="sm:col-span-2">{processando === 'convite' ? 'Gerando…' : 'Gerar convite único'}</Button></form>
        {link && <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><p>Link válido por 48 horas. Copie e envie ao gerente:</p><input readOnly value={link} onFocus={(e) => e.target.select()} className="mt-2 w-full rounded border border-emerald-200 bg-white p-2" /></div>}
      </section>
      <section className="space-y-3"><h2 className="text-lg font-bold text-navy">Equipe cadastrada</h2>{carregando ? <p role="status" className="text-sm text-slate-500">Carregando…</p> : funcionarios.length === 0 ? <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">Ainda não há gerentes com convite aceito.</p> : funcionarios.map((funcionario) => <article key={funcionario.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-navy">{funcionario.nome}</h3><p className="text-sm text-slate-600">{funcionario.usuario?.email || 'Sem conta de acesso'}{funcionario.telefone ? ` · ${funcionario.telefone}` : ''} · {funcionario.funcao} · {funcionario.nivel === 'RESPONSAVEL' ? 'Gerente responsável' : 'Apoio'}{!funcionario.ativo && ' · Inativo'}</p></div></div><div className="mt-4 space-y-2">{funcionario.escalas.length ? funcionario.escalas.map((escala) => <div key={escala.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span><strong>{escala.obra.nome}</strong> · acesso ativo desde {new Date(escala.dataInicio).toLocaleDateString('pt-BR')}</span><Button variant="outline" disabled={Boolean(processando)} onClick={() => removerAcesso(escala, funcionario.nome)} className="px-3 py-1.5 text-xs">{processando === escala.id ? 'Encerrando…' : 'Remover acesso'}</Button></div>) : <p className="text-sm text-slate-500">Sem obra atribuída atualmente.</p>}</div></article>)}</section>
    </main>
  </div>
}
