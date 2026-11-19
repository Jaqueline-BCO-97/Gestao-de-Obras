import AdminMenu from '../components/AdminMenu.jsx'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button.jsx'
import { criarFuncionario, listarFuncionarios, listarObras } from '../services/auth.js'

const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function AdminFuncionarios() {
  const [funcionarios, setFuncionarios] = useState([])
  const [obras, setObras] = useState([])
  const [form, setForm] = useState({ nome: '', telefone: '', funcao: '', foto: null, disponibilidades: {} })
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  async function atualizar() {
    const [lista, listaObras] = await Promise.all([listarFuncionarios(), listarObras()])
    setFuncionarios(lista.filter((item) => !item.usuarioId))
    setObras(listaObras.filter((obra) => !['Concluída'].includes(obra.status)))
  }

  useEffect(() => {
    let ativo = true
    Promise.all([listarFuncionarios(), listarObras()])
      .then(([lista, listaObras]) => { if (ativo) { setFuncionarios(lista.filter((item) => !item.usuarioId)); setObras(listaObras.filter((obra) => obra.status !== 'Concluída')) } })
      .catch((falha) => { if (ativo) setErro(falha.message) })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [])

  function definirObra(obraId, marcada) {
    setForm((atual) => {
      const disponibilidades = { ...atual.disponibilidades }
      if (marcada) disponibilidades[obraId] = disponibilidades[obraId] || []
      else delete disponibilidades[obraId]
      return { ...atual, disponibilidades }
    })
  }

  function definirDia(obraId, dia, marcado) {
    setForm((atual) => {
      const atuais = atual.disponibilidades[obraId] || []
      const selecionados = marcado ? [...new Set([...atuais, dia])] : atuais.filter((item) => item !== dia)
      return { ...atual, disponibilidades: { ...atual.disponibilidades, [obraId]: selecionados } }
    })
  }

  async function enviar(event) {
    event.preventDefault(); setErro(''); setSucesso('')
    const disponibilidades = Object.entries(form.disponibilidades).map(([obraId, diasSemana]) => ({ obraId, diasSemana }))
    if (!form.foto) { setErro('Anexe a foto 3x4 do funcionário.'); return }
    if (!disponibilidades.length || disponibilidades.some((item) => !item.diasSemana.length)) { setErro('Selecione ao menos uma obra e os dias de trabalho em cada obra.'); return }
    if (disponibilidades.length > 1 && disponibilidades.some((item) => disponibilidades.some((outro) => outro.obraId !== item.obraId && item.diasSemana.some((dia) => outro.diasSemana.includes(dia))))) { setErro('O mesmo funcionário não pode ser escalado em duas obras no mesmo dia.'); return }
    setSalvando(true)
    try {
      const foto = await new Promise((resolve, reject) => { const leitor = new FileReader(); leitor.onload = () => resolve({ data: leitor.result, mimeType: form.foto.type }); leitor.onerror = () => reject(new Error('Não foi possível ler a foto selecionada.')); leitor.readAsDataURL(form.foto) })
      await criarFuncionario({ nome: form.nome, telefone: form.telefone, funcao: form.funcao, foto, disponibilidades })
      setForm({ nome: '', telefone: '', funcao: '', foto: null, disponibilidades: {} }); setSucesso('Funcionário cadastrado. Ele não recebeu acesso ao aplicativo.')
      await atualizar()
    } catch (falha) { setErro(falha.message) }
    finally { setSalvando(false) }
  }

  return <div className="min-h-screen bg-background text-ink">
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3"><div><strong className="text-lg text-navy">Obra<span className="text-primary">Master</span></strong><p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Empreiteira</p></div><AdminMenu /></div></header>
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div><h1 className="text-3xl font-bold text-navy">Funcionários</h1><p className="mt-1 text-sm text-slate-600">Cadastre profissionais sem conta de acesso e organize os dias de trabalho em cada obra.</p><Link to="/admin/funcionarios/gerentes" className="mt-2 inline-block text-sm font-semibold text-sky-700 underline">Gerenciar gerentes com acesso →</Link></div>
      {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}{sucesso && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{sucesso}</p>}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Cadastrar funcionário</h2><form onSubmit={enviar} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Nome completo<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
        <label className="text-sm">Telefone<input required type="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
        <label className="text-sm">Função<input required value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
        <label className="text-sm">Foto 3x4 (JPG, PNG ou WebP; até 5 MB)<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setForm({ ...form, foto: e.target.files?.[0] || null })} className="mt-1 block w-full rounded border border-slate-300 p-2" /></label>
        <fieldset className="space-y-3 sm:col-span-2"><legend className="mb-2 text-sm font-semibold text-navy">Obras e dias da semana</legend><p className="mb-3 text-xs text-slate-500">Um funcionário não pode ser programado em mais de uma obra no mesmo dia.</p>{obras.length === 0 && <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">Cadastre uma obra antes de definir a escala.</p>}{obras.map((obra) => {
          const selecionada = Object.hasOwn(form.disponibilidades, obra.id)
          return <div key={obra.id} className="rounded-lg border border-slate-200 p-3"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={selecionada} onChange={(e) => definirObra(obra.id, e.target.checked)} />{obra.titulo}</label>{selecionada && <div className="mt-3 flex flex-wrap gap-3">{dias.map((nomeDia, dia) => <label key={dia} className="flex items-center gap-1 text-xs text-slate-700"><input type="checkbox" checked={(form.disponibilidades[obra.id] || []).includes(dia)} onChange={(e) => definirDia(obra.id, dia, e.target.checked)} />{nomeDia}</label>)}</div>}</div>
        })}</fieldset>
        <Button disabled={salvando || !obras.length} type="submit" className="sm:col-span-2">{salvando ? 'Salvando…' : 'Cadastrar funcionário'}</Button>
      </form></section>
      <section className="space-y-3"><h2 className="text-lg font-bold text-navy">Funcionários cadastrados</h2>{carregando ? <p role="status" className="text-sm text-slate-500">Carregando…</p> : funcionarios.length === 0 ? <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">Ainda não há funcionários sem acesso cadastrados.</p> : funcionarios.map((item) => { const ocupados = new Set((item.disponibilidades || []).flatMap((escala) => escala.diasSemana)); const disponiveis = dias.map((nomeDia, dia) => !ocupados.has(dia) ? nomeDia : null).filter(Boolean); return <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3">{item.fotoUrl && <img src={item.fotoUrl} alt={`Foto de ${item.nome}`} className="h-14 w-14 rounded-full object-cover" />}<div><h3 className="font-bold text-navy">{item.nome}</h3><p className="text-sm text-slate-600">{item.telefone} · {item.funcao}</p><p className="mt-1 text-xs text-slate-500">{(item.disponibilidades || []).map((escala) => `${escala.obra.nome}: ${escala.diasSemana.map((dia) => dias[dia]).join(', ')}`).join(' · ') || 'Sem obra atribuída'}{disponiveis.length > 0 ? ` · Disponível: ${disponiveis.join(', ')}` : ' · Semana ocupada'}</p></div></div><Link to={`/admin/funcionarios/${item.id}`} className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-navy hover:bg-slate-50">Editar dados</Link></article> })}</section>
    </main>
  </div>
}
