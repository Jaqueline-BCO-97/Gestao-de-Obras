import AdminMenu from '../components/AdminMenu.jsx'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button.jsx'
import { atualizarFuncionario, excluirFuncionario, listarFuncionarios, listarObras } from '../services/auth.js'
import { formatarTelefoneBR } from '../utils/telefone.js'
import useConfirmacao from '../components/useConfirmacao.jsx'

const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function AdminFuncionario() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { pedirConfirmacao, modal: modalConfirmacao } = useConfirmacao()
  const [form, setForm] = useState(null)
  const [obras, setObras] = useState([])
  const [buscaObra, setBuscaObra] = useState('')
  const [erro, setErro] = useState('')
  const [erroCarregamento, setErroCarregamento] = useState('')
  const [erroFoto, setErroFoto] = useState('')
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
      if (ativo) { setForm({ nome: funcionario.nome, telefone: formatarTelefoneBR(funcionario.telefone || ''), funcao: funcionario.funcao, foto: null, fotoUrl: funcionario.fotoUrl || '', disponibilidades }); setObras(listaObras.filter((obra) => obra.status !== 'Concluída')) }
    }).catch((falha) => { if (ativo) setErroCarregamento(falha.message) }).finally(() => { if (ativo) setCarregando(false) })
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

  function selecionarObra(obraId, marcada) {
    setForm((atual) => {
      const disponibilidades = { ...atual.disponibilidades }
      if (marcada) disponibilidades[obraId] = disponibilidades[obraId] || []
      else delete disponibilidades[obraId]
      return { ...atual, disponibilidades }
    })
  }

  function selecionarFoto(event) {
    const foto = event.target.files?.[0] || null
    if (foto && (!['image/jpeg', 'image/png', 'image/webp'].includes(foto.type) || foto.size > 5 * 1024 * 1024)) {
      setErroFoto('A foto deve ser JPG, PNG ou WebP e ter até 5 MB.')
      event.target.value = ''
      return
    }
    setErroFoto('')
    setForm({ ...form, foto })
  }

  async function salvar(event) {
    event.preventDefault(); setErro(''); setSucesso('')
    const disponibilidades = Object.entries(form.disponibilidades).map(([obraId, diasSemana]) => ({ obraId, diasSemana }))
    if (disponibilidades.some((item) => !item.diasSemana.length)) { setErro('Escolha ao menos um dia para cada obra selecionada, ou remova a programação da obra.'); return }
    if (disponibilidades.length > 1 && disponibilidades.some((item) => disponibilidades.some((outro) => outro.obraId !== item.obraId && item.diasSemana.some((dia) => outro.diasSemana.includes(dia))))) { setErro('O mesmo funcionário não pode ser escalado em duas obras no mesmo dia.'); return }
    setSalvando(true)
    try {
      let foto
      if (form.foto) foto = await new Promise((resolve, reject) => { const leitor = new FileReader(); leitor.onload = () => resolve({ data: leitor.result, mimeType: form.foto.type }); leitor.onerror = () => reject(new Error('Não foi possível ler a foto selecionada.')); leitor.readAsDataURL(form.foto) })
      await atualizarFuncionario(id, { nome: form.nome, telefone: form.telefone, funcao: form.funcao, disponibilidades, ...(foto ? { foto } : {}) })
      setSucesso('Cadastro atualizado.')
    } catch (falha) { setErro(falha.message) }
    finally { setSalvando(false) }
  }

  async function remover() {
    if (!await pedirConfirmacao(`Excluir ${form.nome}? Funcionários com histórico de escala não podem ser excluídos.`)) return
    setErro(''); setSalvando(true)
    try { await excluirFuncionario(id); navigate('/admin/funcionarios') }
    catch (falha) { setErro(falha.message) }
    finally { setSalvando(false) }
  }

  return <div className="min-h-screen bg-background text-ink">{modalConfirmacao}<header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3"><div><strong className="text-lg text-navy">Obra<span className="text-primary">Master</span></strong><p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Empreiteira</p></div><AdminMenu /></div></header><main className="mx-auto max-w-4xl space-y-5 px-4 py-8"><h1 className="text-3xl font-bold text-navy">Editar funcionário</h1>{carregando ? <p role="status">Carregando cadastro…</p> : erroCarregamento ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erroCarregamento}</p> : form && <form onSubmit={salvar} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Nome completo<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><div className="sm:col-span-2"><p className="text-sm font-semibold text-slate-700">Foto 3x4 (opcional)</p><div className="mt-2 grid h-36 w-28 place-items-center overflow-hidden rounded-md border border-slate-300 bg-slate-50">{form.fotoUrl ? <img src={form.fotoUrl} alt={`Foto de ${form.nome}`} className="h-full w-full object-cover" /> : <span className="px-2 text-center text-xs text-slate-400">Sem foto</span>}</div><label className="mt-2 inline-flex cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-navy hover:bg-slate-50"><span>{form.fotoUrl || form.foto ? 'Trocar foto' : 'Adicionar foto'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={selecionarFoto} className="sr-only" /></label>{erroFoto && <p role="alert" className="mt-1 text-sm font-semibold text-red-800">{erroFoto}</p>}</div><label className="text-sm">Telefone<input required type="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: formatarTelefoneBR(e.target.value) })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Função<input required value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label></div><fieldset className="space-y-3"><legend className="mb-2 font-semibold text-navy">Programação opcional por obra</legend><p className="text-xs text-slate-500">Deixe sem seleção se o funcionário ainda não tiver obra.</p><label className="block text-sm">Buscar obra<input type="search" value={buscaObra} onChange={(e) => setBuscaObra(e.target.value)} placeholder="Digite parte do nome" className="mt-1 w-full rounded border border-slate-300 p-2" /></label>{obras.filter((obra) => obra.titulo.toLocaleLowerCase('pt-BR').includes(buscaObra.trim().toLocaleLowerCase('pt-BR'))).map((obra) => { const selecionada = Object.hasOwn(form.disponibilidades, obra.id); return <details key={obra.id} open={selecionada} className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer font-semibold text-navy">{obra.titulo}</summary><label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={selecionada} onChange={(e) => selecionarObra(obra.id, e.target.checked)} />Programar dias de trabalho nesta obra</label>{selecionada && <div className="mt-3 flex flex-wrap gap-3">{dias.map((nomeDia, dia) => <label key={dia} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={(form.disponibilidades[obra.id] || []).includes(dia)} onChange={(e) => selecionarDia(obra.id, dia, e.target.checked)} />{nomeDia}</label>)}</div>}</details>})}</fieldset><div className="flex flex-wrap items-center gap-2">{erro && <p role="alert" className="w-full rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{erro}</p>}{sucesso && <p role="status" className="w-full rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{sucesso}</p>}<Button disabled={salvando} type="submit">{salvando ? 'Salvando…' : 'Salvar alterações'}</Button><Button variant="outline" type="button" disabled={salvando} onClick={remover}>Excluir funcionário</Button><Button variant="outline" type="button" onClick={() => navigate('/admin/funcionarios')}>Voltar</Button></div></form>}</main></div>
}
