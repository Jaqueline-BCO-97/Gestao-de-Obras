import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button.jsx'
import { atualizarFuncionario, excluirFuncionario, listarFuncionarios, listarObras } from '../services/auth.js'
import { formatarTelefoneBR } from '../utils/telefone.js'
import { textoCorrespondeBusca } from '../utils/buscaTexto.js'
import { prepararProgramacaoFuncionario, programacaoVazia, separarHorarioInicio } from '../utils/programacaoFuncionario.js'
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
      // Recupera os dias agrupados e o horário opcional da API.
      for (const escala of funcionario.disponibilidades || []) disponibilidades[escala.obraId] = { diasSemana: [...(escala.diasSemana || [])], ...separarHorarioInicio(escala.horarioInicio) }
      if (ativo) { setForm({ nome: funcionario.nome, telefone: formatarTelefoneBR(funcionario.telefone || ''), funcao: funcionario.funcao, foto: null, fotoUrl: funcionario.fotoUrl || '', disponibilidades }); setObras(listaObras.filter((obra) => obra.status !== 'Concluída')) }
    }).catch((falha) => { if (ativo) setErroCarregamento(falha.message) }).finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [id])

  function selecionarDia(obraId, dia, marcado) {
    setForm((atual) => {
      const itens = atual.disponibilidades[obraId] || programacaoVazia()
      const valores = marcado ? [...new Set([...itens.diasSemana, dia])] : itens.diasSemana.filter((item) => item !== dia)
      const disponibilidades = { ...atual.disponibilidades, [obraId]: { ...itens, diasSemana: valores } }
      return { ...atual, disponibilidades }
    })
  }

  function selecionarObra(obraId, marcada) {
    setForm((atual) => {
      const disponibilidades = { ...atual.disponibilidades }
      if (marcada) disponibilidades[obraId] = disponibilidades[obraId] || programacaoVazia()
      else delete disponibilidades[obraId]
      return { ...atual, disponibilidades }
    })
  }

  function selecionarParteHorario(obraId, parte, valor) {
    // Atualiza um campo do horário sem remover os dias selecionados.
    setForm((atual) => ({ ...atual, disponibilidades: { ...atual.disponibilidades, [obraId]: { ...(atual.disponibilidades[obraId] || programacaoVazia()), [parte]: valor } } }))
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
    // Valida horários e dias repetidos antes de enviar a programação.
    const resultadoProgramacao = prepararProgramacaoFuncionario(form.disponibilidades)
    if (resultadoProgramacao.erro) { setErro(resultadoProgramacao.erro); return }
    const disponibilidades = resultadoProgramacao.disponibilidades
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

  return <div className="min-h-screen bg-background text-ink">{modalConfirmacao}<main className="mx-auto max-w-4xl space-y-5 px-4 py-8"><h1 className="text-3xl font-bold text-navy">Editar funcionário</h1>{carregando ? <p role="status">Carregando cadastro…</p> : erroCarregamento ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erroCarregamento}</p> : form && <form onSubmit={salvar} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Nome completo<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><div className="sm:col-span-2"><p className="text-sm font-semibold text-slate-700">Foto 3x4 (opcional)</p><div className="mt-2 grid h-36 w-28 place-items-center overflow-hidden rounded-md border border-slate-300 bg-slate-50">{form.fotoUrl ? <img src={form.fotoUrl} alt={`Foto de ${form.nome}`} className="h-full w-full object-cover" /> : <span className="px-2 text-center text-xs text-slate-400">Sem foto</span>}</div><label className="mt-2 inline-flex cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-navy hover:bg-slate-50"><span>{form.fotoUrl || form.foto ? 'Trocar foto' : 'Adicionar foto'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={selecionarFoto} className="sr-only" /></label>{erroFoto && <p role="alert" className="mt-1 text-sm font-semibold text-red-800">{erroFoto}</p>}</div><label className="text-sm">Telefone<input required type="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: formatarTelefoneBR(e.target.value) })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Função<input required value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label></div><fieldset className="space-y-3"><legend className="mb-2 font-semibold text-navy">Programação opcional por obra</legend><p className="text-xs text-slate-500">Deixe sem seleção se o funcionário ainda não tiver obra.</p><label className="block text-sm">Buscar obra<input type="search" value={buscaObra} onChange={(e) => setBuscaObra(e.target.value)} placeholder="Digite parte do nome" className="mt-1 w-full rounded border border-slate-300 p-2" /></label>{obras.filter((obra) => textoCorrespondeBusca(obra.titulo, buscaObra)).map((obra) => { const selecionada = Object.hasOwn(form.disponibilidades, obra.id); const programacao = form.disponibilidades[obra.id] || programacaoVazia(); return <details key={obra.id} open={selecionada} className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer font-semibold text-navy">{obra.titulo}</summary><label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={selecionada} onChange={(e) => selecionarObra(obra.id, e.target.checked)} />Programar dias de trabalho nesta obra</label>{selecionada && <div className="mt-3 space-y-3"><div className="flex flex-wrap gap-3">{dias.map((nomeDia, dia) => <label key={dia} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={programacao.diasSemana.includes(dia)} onChange={(e) => selecionarDia(obra.id, dia, e.target.checked)} />{nomeDia}</label>)}</div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Hora de início<select value={programacao.hora} onChange={(e) => selecionarParteHorario(obra.id, 'hora', e.target.value)} className="mt-1 w-full rounded border border-slate-300 p-2"><option value="">Hora</option>{Array.from({ length: 11 }, (_, indice) => String(indice + 7).padStart(2, '0')).map((hora) => <option key={hora} value={hora}>{hora}</option>)}</select></label><label className="text-xs">Minuto<select value={programacao.minuto} onChange={(e) => selecionarParteHorario(obra.id, 'minuto', e.target.value)} className="mt-1 w-full rounded border border-slate-300 p-2"><option value="">Minuto</option>{Array.from({ length: 60 }, (_, minuto) => String(minuto).padStart(2, '0')).map((minuto) => <option key={minuto} value={minuto}>{minuto}</option>)}</select></label></div><p className="text-xs text-slate-500">Obrigatório quando o mesmo dia estiver programado em outra obra.</p></div>}</details>})}</fieldset><div className="flex flex-wrap items-center gap-2">{erro && <p role="alert" className="w-full rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{erro}</p>}{sucesso && <p role="status" className="w-full rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{sucesso}</p>}<Button disabled={salvando} type="submit">{salvando ? 'Salvando…' : 'Salvar alterações'}</Button><Button variant="outline" type="button" disabled={salvando} onClick={remover}>Excluir funcionário</Button><Button variant="outline" type="button" onClick={() => navigate('/admin/funcionarios')}>Voltar</Button></div></form>}</main></div>
}
