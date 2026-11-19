import AdminMenu from '../components/AdminMenu.jsx'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button.jsx'
import { atualizarFuncionario, listarFuncionarios, listarObras } from '../services/auth.js'

const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function AdminFuncionario() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [obras, setObras] = useState([])
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let ativo = true
    Promise.all([listarFuncionarios(), listarObras()]).then(([lista, listaObras]) => {
      const funcionario = lista.find((item) => item.id === id && !item.usuarioId)
      if (!funcionario) throw new Error('Funcionário sem acesso não encontrado.')
      const disponibilidades = {}
      for (const escala of funcionario.disponibilidades || []) disponibilidades[escala.obraId] = [...(disponibilidades[escala.obraId] || []), escala.diaSemana]
      if (ativo) { setForm({ nome: funcionario.nome, telefone: funcionario.telefone || '', funcao: funcionario.funcao, foto: null, fotoUrl: funcionario.fotoUrl || '', disponibilidades }); setObras(listaObras.filter((obra) => obra.status !== 'Concluída')) }
    }).catch((falha) => { if (ativo) setErro(falha.message) }).finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [id])

  function selecionarDia(obraId, dia, marcado) {
    setForm((atual) => {
      const itens = atual.disponibilidades[obraId] || []
      const valores = marcado ? [...new Set([...itens, dia])] : itens.filter((item) => item !== dia)
      const disponibilidades = { ...atual.disponibilidades }
      if (valores.length) disponibilidades[obraId] = valores
      else delete disponibilidades[obraId]
      return { ...atual, disponibilidades }
    })
  }

  async function salvar(event) {
    event.preventDefault(); setErro(''); setSucesso('')
    const disponibilidades = Object.entries(form.disponibilidades).map(([obraId, diasSemana]) => ({ obraId, diasSemana }))
    if (!disponibilidades.length || disponibilidades.some((item) => !item.diasSemana.length)) { setErro('Selecione ao menos uma obra e os dias de trabalho.'); return }
    if (disponibilidades.length > 1 && disponibilidades.some((item) => disponibilidades.some((outro) => outro.obraId !== item.obraId && item.diasSemana.some((dia) => outro.diasSemana.includes(dia))))) { setErro('O mesmo funcionário não pode ser escalado em duas obras no mesmo dia.'); return }
    setSalvando(true)
    try {
      let foto
      if (form.foto) foto = await new Promise((resolve, reject) => { const leitor = new FileReader(); leitor.onload = () => resolve({ data: leitor.result, mimeType: form.foto.type }); leitor.onerror = () => reject(new Error('Não foi possível ler a foto selecionada.')); leitor.readAsDataURL(form.foto) })
      await atualizarFuncionario(id, { nome: form.nome, telefone: form.telefone, funcao: form.funcao, disponibilidades, ...(foto ? { foto } : {}) })
      setSucesso('Cadastro atualizado.')
      navigate('/admin/funcionarios', { replace: true })
    } catch (falha) { setErro(falha.message) }
    finally { setSalvando(false) }
  }

  return <div className="min-h-screen bg-background text-ink"><header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3"><div><strong className="text-lg text-navy">Obra<span className="text-primary">Master</span></strong><p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Empreiteira</p></div><AdminMenu /></div></header><main className="mx-auto max-w-4xl space-y-5 px-4 py-8"><Link to="/admin/funcionarios" className="text-sm font-semibold text-sky-700">← Voltar para funcionários</Link><h1 className="text-3xl font-bold text-navy">Editar funcionário</h1>{erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}{sucesso && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{sucesso}</p>}{carregando ? <p role="status">Carregando cadastro…</p> : form && <form onSubmit={salvar} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Nome completo<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Telefone<input required type="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Função<input required value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Trocar foto 3x4<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setForm({ ...form, foto: e.target.files?.[0] || null })} className="mt-1 block w-full rounded border border-slate-300 p-2" />{form.fotoUrl && <img src={form.fotoUrl} alt={`Foto de ${form.nome}`} className="mt-2 h-20 w-20 rounded-full object-cover" />}</label></div><fieldset className="space-y-3"><legend className="mb-2 font-semibold text-navy">Obras e dias da semana</legend>{obras.map((obra) => <div key={obra.id} className="rounded-lg border border-slate-200 p-3"><p className="font-semibold">{obra.titulo}</p><div className="mt-2 flex flex-wrap gap-3">{dias.map((nomeDia, dia) => <label key={dia} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={(form.disponibilidades[obra.id] || []).includes(dia)} onChange={(e) => selecionarDia(obra.id, dia, e.target.checked)} />{nomeDia}</label>)}</div></div>)}</fieldset><div className="flex gap-2"><Button disabled={salvando} type="submit">{salvando ? 'Salvando…' : 'Salvar alterações'}</Button><Button variant="outline" type="button" onClick={() => navigate('/admin/funcionarios')}>Cancelar</Button></div></form>}</main></div>
}
