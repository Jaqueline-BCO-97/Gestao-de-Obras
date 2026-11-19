import AdminMenu from '../components/AdminMenu.jsx'
import { useEffect, useState } from 'react'
import Button from '../components/Button.jsx'
import { convidarPessoa, listarClientes, listarConvites, listarObras, reenviarConvite } from '../services/auth.js'

export default function AdminClientes() {
  const [clientes, setClientes] = useState([])
  const [convites, setConvites] = useState([])
  const [obras, setObras] = useState([])
  const [form, setForm] = useState({ obraId: '', nome: '', email: '', telefone: '', endereco: '', quantidadeParcelas: '2', vencimentoInicial: '', contrato: null })
  const [link, setLink] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState('')

  async function atualizar() {
    const [listaClientes, listaConvites, listaObras] = await Promise.all([listarClientes(), listarConvites(), listarObras()])
    setClientes(listaClientes); setConvites(listaConvites); setObras(listaObras)
  }

  useEffect(() => {
    let ativo = true
    Promise.all([listarClientes(), listarConvites(), listarObras()])
      .then(([listaClientes, listaConvites, listaObras]) => {
        if (ativo) { setClientes(listaClientes); setConvites(listaConvites); setObras(listaObras) }
      })
      .catch((falha) => { if (ativo) setErro(falha.message) })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [])

  async function convidar(event) {
    event.preventDefault(); setErro(''); setLink(''); setProcessando('novo')
    try {
      if (!form.contrato) throw new Error('Anexe o contrato PDF do cliente.')
      const arquivo = await new Promise((resolve, reject) => {
        const leitor = new FileReader(); leitor.onload = () => resolve({ data: leitor.result, mimeType: form.contrato.type }); leitor.onerror = () => reject(new Error('Não foi possível ler o contrato.')); leitor.readAsDataURL(form.contrato)
      })
      const resposta = await convidarPessoa('cliente', { ...form, contrato: arquivo })
      setLink(resposta.convite.link)
      setForm({ obraId: '', nome: '', email: '', telefone: '', endereco: '', quantidadeParcelas: '2', vencimentoInicial: '', contrato: null })
      await atualizar()
    } catch (falha) { setErro(falha.message) }
    finally { setProcessando('') }
  }

  async function reenviar(id) {
    setErro(''); setLink(''); setProcessando(id)
    try { const resposta = await reenviarConvite(id); setLink(resposta.convite.link); await atualizar() }
    catch (falha) { setErro(falha.message); await atualizar().catch(() => {}) }
    finally { setProcessando('') }
  }

  return <div className="min-h-screen bg-background text-ink">
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3"><div><strong className="text-lg text-navy">Obra<span className="text-primary">Master</span></strong><p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Empreiteira</p></div><AdminMenu /></div></header>
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8"><div><h1 className="text-3xl font-bold text-navy">Clientes da empreiteira</h1><p className="mt-1 text-sm text-slate-600">Convide seus clientes para acompanhar o andamento das obras vinculadas a eles.</p></div>
      {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Cadastrar cliente da empreiteira</h2><p className="mt-1 text-sm text-slate-600">Vincule o cliente à obra, anexe o contrato e defina as parcelas antes de enviar o convite.</p><form onSubmit={convidar} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm sm:col-span-2">Obra vinculada<select required value={form.obraId} onChange={(e) => setForm({ ...form, obraId: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2"><option value="">Selecione uma obra sem cliente</option>{obras.filter((obra) => !obra.cliente).map((obra) => <option key={obra.id} value={obra.id}>{obra.titulo} · {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(obra.valorBase ?? obra.valorTotal)}</option>)}</select></label><label className="text-sm">Nome completo<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">E-mail<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Telefone<input required type="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Endereço do cliente<input required value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Quantidade de parcelas<select required size="4" value={form.quantidadeParcelas} onChange={(e) => setForm({ ...form, quantidadeParcelas: e.target.value })} className="mt-1 max-h-28 w-full overflow-y-auto rounded border border-slate-300 p-2">{Array.from({ length: 36 }, (_, index) => index + 1).map((qtd) => <option key={qtd} value={qtd}>{qtd} parcela{qtd === 1 ? '' : 's'}{qtd <= 12 ? ' · sem juros' : ' · com juros'}</option>)}</select><span className="mt-1 block text-xs text-slate-500">Até 12 parcelas sem juros. Acima disso, acréscimo padrão de 1% ao mês para cada parcela além da 12ª.</span></label><label className="text-sm">Vencimento da primeira parcela<input required type="date" value={form.vencimentoInicial} onChange={(e) => setForm({ ...form, vencimentoInicial: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm sm:col-span-2">Contrato em PDF (até 10 MB)<input required type="file" accept="application/pdf,.pdf" onChange={(e) => setForm({ ...form, contrato: e.target.files?.[0] || null })} className="mt-1 block w-full rounded border border-slate-300 p-2" /></label><Button disabled={processando === 'novo' || !obras.some((obra) => !obra.cliente)} type="submit" className="sm:col-span-2">{processando === 'novo' ? 'Gerando…' : 'Gerar convite único'}</Button></form>{link && <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><p>Link válido por 48 horas. Copie e envie ao cliente:</p><input readOnly value={link} onFocus={(e) => e.target.select()} className="mt-2 w-full rounded border border-emerald-200 bg-white p-2" /></div>}</section>
      <section className="space-y-3"><h2 className="text-lg font-bold text-navy">Convites pendentes</h2>{carregando ? <p role="status" className="text-sm text-slate-500">Carregando…</p> : convites.filter((item) => item.tipo === 'CLIENTE' && !item.usadoEm).length === 0 ? <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">Nenhum convite pendente.</p> : convites.filter((item) => item.tipo === 'CLIENTE' && !item.usadoEm).map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div><strong className="text-navy">{item.nome}</strong><p className="text-sm text-slate-600">{item.email} · {item.obra?.nome || 'Cliente cadastrado sem obra vinculada'} · {new Date(item.expiraEm) < new Date() ? 'Expirado' : `Expira em ${new Date(item.expiraEm).toLocaleString('pt-BR')}`}</p></div><Button disabled={Boolean(processando)} variant="outline" onClick={() => reenviar(item.id)}>{processando === item.id ? 'Gerando…' : 'Gerar novo link'}</Button></article>)}</section>
      <section className="space-y-3"><h2 className="text-lg font-bold text-navy">Clientes cadastrados</h2>{carregando ? null : clientes.length === 0 ? <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">Nenhum cliente aceitou um convite ainda.</p> : clientes.map((cliente) => <article key={cliente.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3">{cliente.fotoUrl && <img src={cliente.fotoUrl} alt={`Foto de ${cliente.nome}`} className="h-14 w-14 rounded-full object-cover" />}<div><h3 className="font-bold text-navy">{cliente.nome}</h3><p className="text-sm text-slate-600">{cliente.email}{cliente.telefone ? ` · ${cliente.telefone}` : ''}{cliente.telefoneSecundario ? ` · ${cliente.telefoneSecundario}` : ''}</p></div></div>{cliente.endereco && <p className="mt-2 text-sm text-slate-600">Endereço de contato: {cliente.endereco}</p>}<ul className="mt-3 space-y-1 text-sm">{cliente.obrasComoCliente.map((obra) => <li key={obra.id} className="flex justify-between gap-2 rounded bg-slate-50 px-3 py-2"><span>{obra.nome}</span><span className="text-slate-500">{obra.status}</span></li>)}</ul>{cliente.obrasComoCliente.length === 0 && <p className="mt-2 text-xs text-slate-500">Ainda não está vinculado a nenhuma obra.</p>}</article>)}</section>
    </main>
  </div>
}
