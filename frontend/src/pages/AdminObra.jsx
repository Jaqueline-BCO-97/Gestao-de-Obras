import AdminMenu from '../components/AdminMenu.jsx'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '../components/Button.jsx'
import { buscarObra, atualizarObra, anexarContratoObra, iniciarExecucaoObra, solicitarConferenciaObra, registrarAndamentoObra, listarAlocacoesObra, encerrarAlocacaoObra } from '../services/auth.js'

function moeda(valor) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0)) }

export default function AdminObra() {
  const { id } = useParams()
  const [obra, setObra] = useState(null)
  const [escalas, setEscalas] = useState({ alocacoesAbertas: [], historico: [] })
  const [form, setForm] = useState({ nome: '', descricao: '', estado: '', cidade: '', bairro: '', endereco: '', numero: '', semApartamento: false, apartamento: '', semBloco: false, bloco: '', prazoFinal: '', valorTotal: '', informacoesAdicionais: '' })
  const [descricao, setDescricao] = useState('')
  const [tipoRegistro, setTipoRegistro] = useState('ANOTACAO')
  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState('')
  const [arquivoContrato, setArquivoContrato] = useState(null)
  const [termosContrato, setTermosContrato] = useState('')
  const [visivel, setVisivel] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  async function recarregar() {
    const [dadosObra, dadosEscalas] = await Promise.all([buscarObra(id), listarAlocacoesObra(id)])
    setObra(dadosObra); setEscalas(dadosEscalas)
    setForm({ nome: dadosObra.nome || dadosObra.titulo || '', descricao: dadosObra.descricao || '', estado: dadosObra.estado || '', cidade: dadosObra.cidade || '', bairro: dadosObra.bairro || '', endereco: dadosObra.enderecoBase || '', numero: dadosObra.numero || '', semApartamento: dadosObra.semApartamento || false, apartamento: dadosObra.apartamento || '', semBloco: dadosObra.semBloco || false, bloco: dadosObra.bloco || '', prazoFinal: dadosObra.prazoISO || '', valorTotal: dadosObra.valorTotal || '', informacoesAdicionais: dadosObra.informacoesAdicionais || '' })
  }

  useEffect(() => {
    let ativo = true
    Promise.all([buscarObra(id), listarAlocacoesObra(id)])
      .then(([dadosObra, dadosEscalas]) => {
        if (ativo) { setObra(dadosObra); setEscalas(dadosEscalas); setForm({ nome: dadosObra.nome || dadosObra.titulo || '', descricao: dadosObra.descricao || '', estado: dadosObra.estado || '', cidade: dadosObra.cidade || '', bairro: dadosObra.bairro || '', endereco: dadosObra.enderecoBase || '', numero: dadosObra.numero || '', semApartamento: dadosObra.semApartamento || false, apartamento: dadosObra.apartamento || '', semBloco: dadosObra.semBloco || false, bloco: dadosObra.bloco || '', prazoFinal: dadosObra.prazoISO || '', valorTotal: dadosObra.valorTotal || '', informacoesAdicionais: dadosObra.informacoesAdicionais || '' }) }
      })
      .catch((falha) => { if (ativo) setErro(falha.message) })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [id])

  useEffect(() => () => { if (fotoPreview) URL.revokeObjectURL(fotoPreview) }, [fotoPreview])

  async function executar(acao, mensagem) {
    setErro(''); setSucesso(''); setSalvando(true)
    try { await acao(); await recarregar(); setSucesso(mensagem) }
    catch (falha) { setErro(falha.message) }
    finally { setSalvando(false) }
  }

  async function salvarDados(event) {
    event.preventDefault()
    return executar(() => atualizarObra(id, form), 'Dados da obra atualizados.')
  }

  async function salvarContrato(event) {
    event.preventDefault()
    if (!arquivoContrato) { setErro('Selecione o arquivo PDF do contrato.'); return }
    if (arquivoContrato.type !== 'application/pdf' || arquivoContrato.size > 10 * 1024 * 1024) { setErro('O contrato deve ser um PDF de até 10 MB.'); return }
    setErro(''); setSucesso(''); setSalvando(true)
    try {
      const arquivo = await new Promise((resolve, reject) => {
        const leitor = new FileReader(); leitor.onload = () => resolve({ data: leitor.result, mimeType: arquivoContrato.type }); leitor.onerror = () => reject(new Error('Não foi possível ler o contrato.')); leitor.readAsDataURL(arquivoContrato)
      })
      await anexarContratoObra(id, arquivo, termosContrato)
      setArquivoContrato(null); setTermosContrato(''); await recarregar(); setSucesso('Contrato salvo e disponível para o cliente.')
    } catch (falha) { setErro(falha.message) }
    finally { setSalvando(false) }
  }

  async function registrarNota(event) {
    event.preventDefault()
    if (!descricao.trim()) { setErro('Escreva uma atualização antes de salvar.'); return }
    if (foto && (!['image/jpeg', 'image/png', 'image/webp'].includes(foto.type) || foto.size > 5 * 1024 * 1024)) { setErro('Escolha uma foto JPG, PNG ou WebP de até 5 MB.'); return }
    setErro(''); setSucesso(''); setSalvando(true)
    try {
      let fotoEnviada
      if (foto) {
        fotoEnviada = await new Promise((resolve, reject) => {
          const leitor = new FileReader()
          leitor.onload = () => resolve({ data: leitor.result, mimeType: foto.type })
          leitor.onerror = () => reject(new Error('Não foi possível ler a foto selecionada.'))
          leitor.readAsDataURL(foto)
        })
      }
      await registrarAndamentoObra(id, descricao.trim(), tipoRegistro, fotoEnviada, visivel)
      setDescricao(''); setFoto(null); setTipoRegistro('ANOTACAO'); if (fotoPreview) URL.revokeObjectURL(fotoPreview); setFotoPreview(''); await recarregar(); setSucesso('Atualização registrada no histórico.')
    } catch (falha) { setErro(falha.message) }
    finally { setSalvando(false) }
  }

  async function removerAcesso(alocacao) {
    const nome = alocacao.funcionario?.nome || 'este gerente'
    if (!window.confirm(`Encerrar o acesso de ${nome} a esta obra? O histórico será mantido.`)) return
    await executar(() => encerrarAlocacaoObra(id, alocacao.id, 'Acesso encerrado pela empreiteira'), 'Acesso encerrado.')
  }

  if (carregando) return <main className="min-h-screen bg-background p-8 text-center text-slate-600" role="status">Carregando obra…</main>
  if (!obra) return <main className="min-h-screen bg-background p-8"><Link to="/admin/obras">← Voltar para obras</Link><h1 className="mt-5 text-2xl font-bold text-navy">Obra não encontrada</h1>{erro && <p role="alert" className="mt-3 text-red-700">{erro}</p>}</main>

  return <div className="min-h-screen bg-background text-ink"><header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3"><div><strong className="text-lg text-navy">Obra<span className="text-primary">Master</span></strong><p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Empreiteira · Detalhe da obra</p></div><AdminMenu /></div></header>
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8"><Link to="/admin/obras" className="text-sm font-semibold text-sky-700">← Voltar para Gestão de Obras</Link>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-navy">{obra.titulo || obra.nome}</h1><p className="mt-1 text-sm text-slate-600">Cliente: {obra.cliente || 'Ainda não convidado'} · Status: <strong>{obra.status}</strong></p></div><div className="flex flex-wrap gap-2">{obra.status === 'Agendada' && <Button disabled={salvando} onClick={() => executar(() => iniciarExecucaoObra(id), 'Execução iniciada.')}>Iniciar execução</Button>}{obra.status === 'Em andamento' && <Button disabled={salvando} onClick={() => executar(() => solicitarConferenciaObra(id), 'Obra enviada para conferência do cliente.')}>Solicitar conferência</Button>}</div></div><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><p><strong>Endereço</strong><br />{obra.endereco || 'Não informado'}</p><p><strong>Prazo</strong><br />{obra.prazo || 'Não informado'}</p><p><strong>Valor total</strong><br />{moeda(obra.valorTotal)}</p><p><strong>Parcelas</strong><br />{[obra.parcela1, obra.parcela2].filter(Boolean).map((p) => `${p.situacao}: ${moeda(p.valor)}`).join(' · ') || 'Não cadastradas'}</p></div></section>
      {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}{sucesso && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{sucesso}</p>}
      <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Dados da obra</h2><form onSubmit={salvarDados} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="block text-sm sm:col-span-2">Nome da obra<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="block text-sm sm:col-span-2">Descrição<textarea required rows="3" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="block text-sm">Estado<input required value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="block text-sm">Cidade<input required value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="block text-sm">Bairro<input required value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="block text-sm">Rua ou avenida<input required value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="block text-sm">Número<input required value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="block text-sm">Apartamento<input disabled={form.semApartamento} required={!form.semApartamento} value={form.apartamento} onChange={(e) => setForm({ ...form, apartamento: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 disabled:bg-slate-100" /><span className="mt-1 flex items-center gap-2 text-xs"><input type="checkbox" checked={form.semApartamento} onChange={(e) => setForm({ ...form, semApartamento: e.target.checked, apartamento: '' })} />Não existe apartamento</span></label><label className="block text-sm">Bloco<input disabled={form.semBloco} required={!form.semBloco} value={form.bloco} onChange={(e) => setForm({ ...form, bloco: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2 disabled:bg-slate-100" /><span className="mt-1 flex items-center gap-2 text-xs"><input type="checkbox" checked={form.semBloco} onChange={(e) => setForm({ ...form, semBloco: e.target.checked, bloco: '' })} />Não existe bloco</span></label><label className="block text-sm">Prazo final<input required type="date" value={form.prazoFinal} onChange={(e) => setForm({ ...form, prazoFinal: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="block text-sm">Valor final (R$)<input required type="number" min="0.01" step="0.01" value={form.valorTotal} onChange={(e) => setForm({ ...form, valorTotal: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="block text-sm sm:col-span-2">Serviços, materiais e medidas previstos<textarea required rows="4" value={form.informacoesAdicionais} onChange={(e) => setForm({ ...form, informacoesAdicionais: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><Button type="submit" disabled={salvando} className="sm:col-span-2">Salvar alterações</Button></form></section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Equipe com acesso</h2><p className="mt-1 text-xs text-slate-500">Gerentes atribuídos a esta obra podem registrar o andamento do canteiro.</p><Link className="mt-2 inline-block text-sm font-semibold text-sky-700" to="/admin/funcionarios">Convidar ou consultar gerentes →</Link><div className="mt-4 space-y-2">{escalas.alocacoesAbertas.map((alocacao) => <div key={alocacao.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span><strong>{alocacao.funcionario.nome}</strong> · {alocacao.funcionario.funcao} · desde {new Date(alocacao.dataInicio).toLocaleDateString('pt-BR')}</span><Button variant="outline" disabled={salvando} onClick={() => removerAcesso(alocacao)} className="px-3 py-1.5 text-xs">Remover acesso</Button></div>)}{escalas.alocacoesAbertas.length === 0 && <p className="text-sm text-slate-500">Nenhum gerente tem acesso ativo a esta obra.</p>}</div><h3 className="mt-5 font-semibold text-navy">Histórico de acessos</h3><ul className="mt-2 space-y-1 text-xs text-slate-600">{escalas.historico.slice(0, 8).map((alocacao) => <li key={alocacao.id}>{alocacao.funcionario.nome} · encerrou em {new Date(alocacao.dataFim).toLocaleDateString('pt-BR')} · por {alocacao.alteradoPor.nome}</li>)}</ul></section></div>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Contrato da obra</h2>{obra.contrato?.arquivoUrl && <a href={obra.contrato.arquivoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-sky-700 underline">Abrir contrato atual (PDF)</a>}<form onSubmit={salvarContrato} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm">Anexar contrato PDF (até 10 MB)<input type="file" accept="application/pdf,.pdf" onChange={(e) => setArquivoContrato(e.target.files?.[0] || null)} className="mt-1 block w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Observações para o cliente<textarea rows="2" maxLength={10000} value={termosContrato} onChange={(e) => setTermosContrato(e.target.value)} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><Button type="submit" disabled={salvando || !arquivoContrato} className="sm:col-span-2">Salvar contrato</Button></form></section>
      {(obra.fotos || []).length > 0 && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Fotos da obra</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{obra.fotos.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Foto da obra ${obra.titulo}`} loading="lazy" className="h-48 w-full rounded-lg object-cover" /></a>)}</div></section>}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Registrar atualização</h2><p className="mt-1 text-sm text-slate-600">A empreiteira também pode registrar progresso, anotação ou ocorrência no histórico.</p><form onSubmit={registrarNota} className="mt-4 space-y-3"><label className="block text-sm">Tipo<select value={tipoRegistro} onChange={(e) => setTipoRegistro(e.target.value)} className="mt-1 w-full rounded border border-slate-300 p-2"><option value="ATUALIZACAO">Atualização de andamento</option><option value="ANOTACAO">Anotação</option><option value="OCORRENCIA">Ocorrência</option></select></label><textarea required rows="3" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={2000} placeholder="Descreva a atualização da obra…" className="w-full rounded border border-slate-300 p-3" /><label className="block text-sm">Foto opcional<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { if (fotoPreview) URL.revokeObjectURL(fotoPreview); const arquivo = e.target.files?.[0] || null; setFoto(arquivo); setFotoPreview(arquivo ? URL.createObjectURL(arquivo) : '') }} className="mt-1 block w-full text-sm" /></label>{fotoPreview && <img src={fotoPreview} alt="Prévia da foto selecionada" className="max-h-64 rounded-lg object-contain" />}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visivel} onChange={(e) => setVisivel(e.target.checked)} /> Visível para o cliente</label><Button type="submit" disabled={salvando}>Registrar atualização</Button></form></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Histórico da obra</h2><ol className="mt-4 space-y-3">{(obra.timeline || []).map((item) => <li key={item.id} className="border-l-2 border-sky-200 pl-3"><p className="text-xs text-slate-500">{item.data} {item.hora} · {item.autor || 'Sistema'} · {item.tipo}</p><p className="text-sm text-slate-800">{item.descricao}</p>{item.fotoUrl && <a className="text-xs text-sky-700 underline" href={item.fotoUrl} target="_blank" rel="noreferrer">Abrir foto</a>}</li>)}</ol>{!obra.timeline?.length && <p className="mt-3 text-sm text-slate-500">Nenhuma atualização registrada.</p>}</section>
    </main></div>
}
