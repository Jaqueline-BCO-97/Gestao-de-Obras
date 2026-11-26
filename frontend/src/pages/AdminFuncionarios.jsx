import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button.jsx'
import { criarFuncionario, listarFuncionarios, listarObras } from '../services/auth.js'
import { formatarTelefoneBR } from '../utils/telefone.js'
import { textoCorrespondeBusca } from '../utils/buscaTexto.js'
import { prepararProgramacaoFuncionario, programacaoVazia } from '../utils/programacaoFuncionario.js'

const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function AdminFuncionarios() {
  const [funcionarios, setFuncionarios] = useState([])
  const [obras, setObras] = useState([])
  const [form, setForm] = useState({ nome: '', telefone: '', funcao: '', foto: null, disponibilidades: {} })
  const [buscaObra, setBuscaObra] = useState('')
  const [erro, setErro] = useState('')
  const [erroLista, setErroLista] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  async function atualizar() {
    const [lista, listaObras] = await Promise.all([listarFuncionarios(), listarObras()])
    setFuncionarios(lista.filter((item) => !item.usuarioId))
    setObras(listaObras.filter((obra) => !['Concluída'].includes(obra.status)))
    setErroLista('')
  }

  useEffect(() => {
    let ativo = true
    Promise.all([listarFuncionarios(), listarObras()])
      .then(([lista, listaObras]) => { if (ativo) { setFuncionarios(lista.filter((item) => !item.usuarioId)); setObras(listaObras.filter((obra) => obra.status !== 'Concluída')) } })
      .catch((falha) => { if (ativo) setErroLista(falha.message) })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [])

  function definirObra(obraId, marcada) {
    setForm((atual) => {
      const disponibilidades = { ...atual.disponibilidades }
      if (marcada) disponibilidades[obraId] = disponibilidades[obraId] || programacaoVazia()
      else delete disponibilidades[obraId]
      return { ...atual, disponibilidades }
    })
  }

  function definirDia(obraId, dia, marcado) {
    setForm((atual) => {
      const atuais = atual.disponibilidades[obraId] || programacaoVazia()
      const selecionados = marcado ? [...new Set([...atuais.diasSemana, dia])] : atuais.diasSemana.filter((item) => item !== dia)
      return { ...atual, disponibilidades: { ...atual.disponibilidades, [obraId]: { ...atuais, diasSemana: selecionados } } }
    })
  }

  function definirParteHorario(obraId, parte, valor) {
    // Atualiza hora ou minuto sem apagar os dias marcados para a obra.
    setForm((atual) => ({ ...atual, disponibilidades: { ...atual.disponibilidades, [obraId]: { ...(atual.disponibilidades[obraId] || programacaoVazia()), [parte]: valor } } }))
  }

  async function enviar(event) {
    event.preventDefault(); setErro(''); setSucesso('')
    const resultadoProgramacao = prepararProgramacaoFuncionario(form.disponibilidades)
    if (resultadoProgramacao.erro) { setErro(resultadoProgramacao.erro); return }
    const disponibilidades = resultadoProgramacao.disponibilidades
    if (form.foto && (!['image/jpeg', 'image/png', 'image/webp'].includes(form.foto.type) || form.foto.size > 5 * 1024 * 1024)) { setErro('A foto deve ser JPG, PNG ou WebP e ter até 5 MB.'); return }
    setSalvando(true)
    try {
      const foto = form.foto ? await new Promise((resolve, reject) => { const leitor = new FileReader(); leitor.onload = () => resolve({ data: leitor.result, mimeType: form.foto.type }); leitor.onerror = () => reject(new Error('Não foi possível ler a foto selecionada.')); leitor.readAsDataURL(form.foto) }) : undefined
      await criarFuncionario({ nome: form.nome, telefone: form.telefone, funcao: form.funcao, ...(foto ? { foto } : {}), disponibilidades })
      setForm({ nome: '', telefone: '', funcao: '', foto: null, disponibilidades: {} }); setSucesso('Funcionário cadastrado. Ele não recebeu acesso ao aplicativo.')
      await atualizar()
    } catch (falha) { setErro(falha.message) }
    finally { setSalvando(false) }
  }

  return <div className="min-h-screen bg-background text-ink">

    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div><h1 className="text-3xl font-bold text-navy">Funcionários</h1><p className="mt-1 text-sm text-slate-600">Cadastre profissionais sem conta de acesso e organize os dias de trabalho em cada obra.</p><Link to="/admin/funcionarios/gerentes" className="mt-2 inline-block text-sm font-semibold text-sky-700 underline">Gerenciar gerentes com acesso →</Link></div>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Cadastrar funcionário</h2><form onSubmit={enviar} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Nome completo<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
        <label className="text-sm">Telefone<input required type="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: formatarTelefoneBR(e.target.value) })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
        <label className="text-sm">Função<input required value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
        <label className="text-sm">Foto 3x4 opcional (JPG, PNG ou WebP; até 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setForm({ ...form, foto: e.target.files?.[0] || null })} className="mt-1 block w-full rounded border border-slate-300 p-2" />{form.foto && <span className="mt-1 block text-xs text-slate-600">Foto selecionada: {form.foto.name}</span>}</label>
        <fieldset className="space-y-3 sm:col-span-2"><legend className="mb-2 text-sm font-semibold text-navy">Programação opcional por obra</legend><p className="mb-3 text-xs text-slate-500">Deixe sem seleção se o funcionário ainda não tiver obra. A busca encontra nomes que contêm o texto digitado.</p><label className="block text-sm">Buscar obra<input type="search" value={buscaObra} onChange={(e) => setBuscaObra(e.target.value)} placeholder="Digite parte do nome" className="mt-1 w-full rounded border border-slate-300 p-2" /></label>{obras.length === 0 && <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">Nenhuma obra disponível. O funcionário pode ser cadastrado sem programação.</p>}{obras.filter((obra) => textoCorrespondeBusca(obra.titulo, buscaObra)).map((obra) => {
          const selecionada = Object.hasOwn(form.disponibilidades, obra.id)
          const programacao = form.disponibilidades[obra.id] || programacaoVazia()
          return <details key={obra.id} open={selecionada} className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-semibold text-navy">{obra.titulo}</summary><label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={selecionada} onChange={(e) => definirObra(obra.id, e.target.checked)} />Programar dias de trabalho nesta obra</label>{selecionada && <div className="mt-3 space-y-3"><div className="flex flex-wrap gap-3">{dias.map((nomeDia, dia) => <label key={dia} className="flex items-center gap-1 text-xs text-slate-700"><input type="checkbox" checked={programacao.diasSemana.includes(dia)} onChange={(e) => definirDia(obra.id, dia, e.target.checked)} />{nomeDia}</label>)}</div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Hora de início<select value={programacao.hora} onChange={(e) => definirParteHorario(obra.id, 'hora', e.target.value)} className="mt-1 w-full rounded border border-slate-300 p-2"><option value="">Hora</option>{Array.from({ length: 11 }, (_, indice) => String(indice + 7).padStart(2, '0')).map((hora) => <option key={hora} value={hora}>{hora}</option>)}</select></label><label className="text-xs">Minuto<select value={programacao.minuto} onChange={(e) => definirParteHorario(obra.id, 'minuto', e.target.value)} className="mt-1 w-full rounded border border-slate-300 p-2"><option value="">Minuto</option>{Array.from({ length: 60 }, (_, minuto) => String(minuto).padStart(2, '0')).map((minuto) => <option key={minuto} value={minuto}>{minuto}</option>)}</select></label></div><p className="text-xs text-slate-500">Obrigatório quando o mesmo dia estiver programado em outra obra.</p></div>}</details>
        })}</fieldset>
        {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800 sm:col-span-2">{erro}</p>}{sucesso && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 sm:col-span-2">{sucesso}</p>}<Button disabled={salvando} type="submit" className="sm:col-span-2">{salvando ? 'Salvando…' : 'Cadastrar funcionário'}</Button>
      </form></section>
      <section className="space-y-3"><h2 className="text-lg font-bold text-navy">Funcionários cadastrados</h2>{erroLista && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erroLista} <button type="button" className="font-semibold underline" onClick={() => atualizar().catch((falha) => setErroLista(falha.message))}>Tentar novamente</button></p>}{carregando ? <p role="status" className="text-sm text-slate-500">Carregando…</p> : funcionarios.length === 0 ? <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">Ainda não há funcionários sem acesso cadastrados.</p> : funcionarios.map((item) => { const ocupados = new Set((item.disponibilidades || []).flatMap((escala) => escala.diasSemana)); const disponiveis = dias.map((nomeDia, dia) => !ocupados.has(dia) ? nomeDia : null).filter(Boolean); return <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3">{item.fotoUrl && <img src={item.fotoUrl} alt={`Foto de ${item.nome}`} className="h-14 w-14 rounded-full object-cover" />}<div><h3 className="font-bold text-navy">{item.nome}</h3><p className="text-sm text-slate-600">{item.telefone} · {item.funcao}</p><p className="mt-1 text-xs text-slate-500">{(item.disponibilidades || []).map((escala) => `${escala.obra.nome}: ${escala.diasSemana.map((dia) => dias[dia]).join(', ')}${escala.horarioInicio ? ` · ${escala.horarioInicio}` : ''}`).join(' · ') || 'Sem obra atribuída'}{disponiveis.length > 0 ? ` · Disponível: ${disponiveis.join(', ')}` : ' · Semana ocupada'}</p></div></div><Link to={`/admin/funcionarios/${item.id}`} className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-navy hover:bg-slate-50">Editar dados</Link></article> })}</section>
    </main>
  </div>
}
