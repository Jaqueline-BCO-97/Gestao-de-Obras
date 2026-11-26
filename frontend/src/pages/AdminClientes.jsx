import { useEffect, useState } from 'react'
import Button from '../components/Button.jsx'
import { buscarCliente, convidarPessoa, excluirCliente, excluirConviteExpirado, listarClientes, listarConvites, listarObras, reenviarConvite } from '../services/auth.js'
import { formatarTelefoneBR } from '../utils/telefone.js'
import useConfirmacao from '../components/useConfirmacao.jsx'
// Mantém a opção de repetir exclusões somente para falhas recuperáveis.
import { deveOferecerNovaTentativaExclusaoCliente } from '../utils/erroExclusaoCliente.js'

// Mantém somente os dados de cliente e o contrato no formulário de convite.
const FORMULARIO_VAZIO = { obraId: '', nome: '', email: '', telefone: '', endereco: '', estado: '', cidade: '', bairro: '', numero: '', apartamento: '', bloco: '', semApartamento: false, semBloco: false, contrato: null }

export default function AdminClientes() {
  const { pedirConfirmacao, modal: modalConfirmacao } = useConfirmacao()
  const [clientes, setClientes] = useState([])
  const [convites, setConvites] = useState([])
  const [obras, setObras] = useState([])
  const [form, setForm] = useState(FORMULARIO_VAZIO)
  const [detalhesCliente, setDetalhesCliente] = useState(null)
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false)
  const [link, setLink] = useState('')
  const [erro, setErro] = useState('')
  const [erroLista, setErroLista] = useState('')
  // Guarda mensagens de bloqueio por cliente sem misturá-las aos erros de carregamento.
  const [erroExclusaoCliente, setErroExclusaoCliente] = useState({})
  // Guarda a confirmação exibida após excluir cliente ou suas obras agendadas.
  const [feedbackExclusaoCliente, setFeedbackExclusaoCliente] = useState('')
  const [erroConvites, setErroConvites] = useState({})
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
      .catch((falha) => { if (ativo) setErroLista(falha.message) })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [])

  async function convidar(event) {
    event.preventDefault(); setErro(''); setLink(''); setProcessando('novo')
    try {
      // Confirma novamente a obra selecionada para evitar um vínculo duplicado por estado desatualizado.
      const obraEscolhida = obras.find((obra) => obra.id === form.obraId)
      if (!obraEscolhida) throw new Error('Selecione uma obra disponível para vincular o cliente.')
      // Procura a parcela número um para usar a data definida na obra selecionada.
      const primeiraParcela = obraEscolhida.parcelas?.find((parcela) => Number(parcela.numero) === 1)
      // Bloqueia o convite quando a obra não tem uma data de vencimento persistida.
      if (!primeiraParcela?.vencimentoISO) throw new Error('Esta obra não tem vencimento da primeira parcela. Edite a obra e informe a data antes de convidar o cliente.')
      // Impede novo vínculo caso a obra já tenha cliente associado.
      if (obraEscolhida.cliente) throw new Error('Esta obra já está vinculada a um cliente. Selecione outra obra.')
      if (!form.contrato) throw new Error('Anexe o contrato PDF do cliente.')
      if (form.contrato.type !== 'application/pdf' || form.contrato.size > 10 * 1024 * 1024) throw new Error('O contrato deve ser um PDF de até 10 MB.')
      const arquivo = await new Promise((resolve, reject) => {
        const leitor = new FileReader(); leitor.onload = () => resolve({ data: leitor.result, mimeType: form.contrato.type }); leitor.onerror = () => reject(new Error('Não foi possível ler o contrato.')); leitor.readAsDataURL(form.contrato)
      })
      const resposta = await convidarPessoa('cliente', { ...form, contrato: arquivo })
      setLink(resposta.convite.link)
      setForm(FORMULARIO_VAZIO)
      await atualizar()
    } catch (falha) { setErro(falha.message) }
    finally { setProcessando('') }
  }

  async function reenviar(id) {
    setErroConvites((atuais) => ({ ...atuais, [id]: '' })); setLink(''); setProcessando(id)
    try { const resposta = await reenviarConvite(id); setLink(resposta.convite.link); await atualizar() }
    catch (falha) { setErroConvites((atuais) => ({ ...atuais, [id]: falha.message })); await atualizar().catch(() => {}) }
    finally { setProcessando('') }
  }

  async function verInformacoes(id) {
    setCarregandoDetalhes(true); setDetalhesCliente(null)
    try { setDetalhesCliente(await buscarCliente(id)) }
    catch (falha) { setErroLista(falha.message) }
    finally { setCarregandoDetalhes(false) }
  }

  async function removerCliente(cliente) {
    // Confirma a remoção definitiva das obras agendadas e dos vínculos sem uso.
    if (!await pedirConfirmacao(`Excluir ${cliente.nome} e suas obras ainda Agendadas? Parcelas pendentes e convites sem uso dessas obras também serão removidos.`)) return
    // Limpa o erro e o aviso anterior antes de iniciar a solicitação.
    setErroExclusaoCliente((atuais) => ({ ...atuais, [cliente.id]: null }))
    setFeedbackExclusaoCliente('')
    // Reutiliza o estado atual para desativar o botão enquanto a API trabalha.
    setProcessando(`excluir-cliente-${cliente.id}`)
    try {
      // Pede à API a exclusão atômica das obras e vínculos elegíveis.
      const resposta = await excluirCliente(cliente.id)
      // Limpa mensagens antigas após a exclusão confirmada.
      setErroExclusaoCliente((atuais) => ({ ...atuais, [cliente.id]: null }))
      // Fecha o modal de detalhes caso o cliente excluído estivesse aberto.
      if (detalhesCliente?.id === cliente.id) setDetalhesCliente(null)
      // Remove o cartão apenas quando a conta do cliente também foi removida.
      if (resposta?.usuarioRemovido !== false) {
        setClientes((atuais) => atuais.filter((item) => item.id !== cliente.id))
      }
      // Remove do formulário as obras que acabaram de ser excluídas com o cliente.
      setObras((atuais) => atuais.filter((obra) => obra.clienteId !== cliente.id))
      // Informa ao administrador o resultado exato retornado pelo backend.
      if (resposta?.mensagem) setFeedbackExclusaoCliente(resposta.mensagem)
      // Atualiza as listas sem refazer a exclusão caso a atualização falhe.
      await atualizar().catch((falha) => setErroLista(falha.message))
    } catch (falha) {
      // Exibe o motivo específico e oferece nova tentativa somente para falha recuperável.
      setErroExclusaoCliente((atuais) => ({ ...atuais, [cliente.id]: {
        mensagem: falha.message,
        podeTentarNovamente: deveOferecerNovaTentativaExclusaoCliente(falha),
      } }))
    } finally {
      // Libera os botões mesmo quando a API recusa ou falha.
      setProcessando('')
    }
  }

  async function removerConvite(item) {
    if (!await pedirConfirmacao(`Excluir o convite expirado de ${item.nome}?`)) return
    try { await excluirConviteExpirado(item.id); await atualizar() }
    catch (falha) { setErroConvites((atuais) => ({ ...atuais, [item.id]: falha.message })) }
  }

  function nomeEndereco(item) {
    return [item.endereco, item.numero, !item.semApartamento && item.apartamento ? `Apto ${item.apartamento}` : '', !item.semBloco && item.bloco ? `Bloco ${item.bloco}` : '', item.bairro, item.cidade, item.estado].filter(Boolean).join(' · ')
  }

// Localiza a obra selecionada para mostrar sua quantidade, seu valor e seu vencimento.
  const obraSelecionada = obras.find((obra) => obra.id === form.obraId)
  // Obtém a data da parcela número um sem adicionar um campo editável ao formulário.
  const vencimentoInicialObra = obraSelecionada?.parcelas?.find((parcela) => Number(parcela.numero) === 1)?.vencimentoISO || ''
  // Formata a data ISO para o padrão brasileiro mostrado na tela.
  const vencimentoInicialFormatado = vencimentoInicialObra.split('-').reverse().join('/')

  return <div className="min-h-screen bg-background text-ink">{modalConfirmacao}

    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8"><div><h1 className="text-3xl font-bold text-navy">Clientes da empreiteira</h1><p className="mt-1 text-sm text-slate-600">Convide seus clientes para acompanhar o andamento das obras vinculadas a eles.</p></div>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Cadastrar cliente da empreiteira</h2>{/* Explica que o calendário financeiro é definido pela obra selecionada. */}<p className="mt-1 text-sm text-slate-600">Vincule o cliente à obra, informe o endereço completo e anexe o contrato. Vencimento, quantidade e valor total vêm da obra.</p><form onSubmit={convidar} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm sm:col-span-2">Obra vinculada<select required value={form.obraId} onChange={(e) => setForm({ ...form, obraId: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2"><option value="">Selecione uma obra sem cliente</option>{obras.filter((obra) => !obra.cliente).map((obra) => <option key={obra.id} value={obra.id}>{obra.titulo} · {obra.quantidadeParcelas} parcelas · {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(obra.valorTotal ?? obra.valorBase)}</option>)}</select></label>{obraSelecionada && <p className="self-center text-sm text-slate-600">Quantidade e valor definidos na obra: <strong>{obraSelecionada.quantidadeParcelas} parcelas</strong> · <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(obraSelecionada.valorTotal ?? obraSelecionada.valorBase)}</strong>.</p>}{/* Mostra o vencimento de forma somente leitura ou orienta a corrigir a obra. */}{form.obraId && (vencimentoInicialObra ? <p className="self-center text-sm text-slate-600">Vencimento da primeira parcela: {vencimentoInicialFormatado} (definido na obra)</p> : <p role="alert" className="self-center text-sm font-semibold text-red-800">{'Esta obra não tem vencimento da primeira parcela. Edite a obra e informe a data antes de convidar o cliente.'}</p>)}<label className="text-sm">Nome completo<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">E-mail<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Telefone<input required type="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: formatarTelefoneBR(e.target.value) })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Estado<input required value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Cidade<input required value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Bairro<input required value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm sm:col-span-2">Rua ou avenida<input required value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Número<input required inputMode="numeric" pattern="[0-9]+" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value.replace(/\D/g, '') })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><div className="grid gap-2 sm:grid-cols-2"><label className="text-sm">Apartamento<input disabled={form.semApartamento} required={!form.semApartamento} inputMode="numeric" pattern="[0-9]+" value={form.apartamento} onChange={(e) => setForm({ ...form, apartamento: e.target.value.replace(/\D/g, '') })} className="mt-1 w-full rounded border border-slate-300 p-2 disabled:bg-slate-100" /></label><label className="mt-6 flex items-center gap-2 text-xs"><input type="checkbox" checked={form.semApartamento} onChange={(e) => setForm({ ...form, semApartamento: e.target.checked, apartamento: '' })} />Não tem apartamento</label></div><div className="grid gap-2 sm:grid-cols-2"><label className="text-sm">Bloco<input disabled={form.semBloco} required={!form.semBloco} pattern="[A-Za-z0-9]+" value={form.bloco} onChange={(e) => setForm({ ...form, bloco: e.target.value.replace(/[^a-z\d]/gi, '') })} className="mt-1 w-full rounded border border-slate-300 p-2 disabled:bg-slate-100" /></label><label className="mt-6 flex items-center gap-2 text-xs"><input type="checkbox" checked={form.semBloco} onChange={(e) => setForm({ ...form, semBloco: e.target.checked, bloco: '' })} />Não tem bloco</label></div><label className="text-sm sm:col-span-2">Contrato em PDF (até 10 MB)<input required type="file" accept="application/pdf,.pdf" onChange={(e) => setForm({ ...form, contrato: e.target.files?.[0] || null })} className="mt-1 block w-full rounded border border-slate-300 p-2" /></label>{erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800 sm:col-span-2">{erro}</p>}{/* Bloqueia a geração enquanto a obra selecionada não tiver primeira data. */}<Button disabled={processando === 'novo' || !obras.some((obra) => !obra.cliente) || Boolean(form.obraId && !vencimentoInicialObra)} type="submit" className="sm:col-span-2">{processando === 'novo' ? 'Gerando…' : 'Gerar convite único'}</Button></form>{link && <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><p>Link válido por 48 horas. Copie e envie ao cliente:</p><input readOnly value={link} onFocus={(e) => e.target.select()} className="mt-2 w-full rounded border border-emerald-200 bg-white p-2" /></div>}</section>
      <section className="space-y-3"><h2 className="text-lg font-bold text-navy">Convites pendentes</h2>{erroLista && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erroLista} <button type="button" className="font-semibold underline" onClick={() => atualizar().catch((falha) => setErroLista(falha.message))}>Tentar novamente</button></p>}{carregando ? <p role="status" className="text-sm text-slate-500">Carregando…</p> : convites.filter((item) => item.tipo === 'CLIENTE' && !item.usadoEm).length === 0 ? <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">Nenhum convite pendente.</p> : convites.filter((item) => item.tipo === 'CLIENTE' && !item.usadoEm).map((item) => { const expirado = new Date(item.expiraEm) <= new Date(); return <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div><strong className="text-navy">{item.nome}</strong><p className="text-sm text-slate-600">{item.email} · {item.obra?.nome || 'Cliente cadastrado sem obra vinculada'} · {expirado ? 'Expirado' : `Expira em ${new Date(item.expiraEm).toLocaleString('pt-BR')}`}</p>{erroConvites[item.id] && <p role="alert" className="mt-2 rounded bg-red-50 p-2 text-sm font-semibold text-red-800">{erroConvites[item.id]}</p>}</div><div className="flex gap-2">{expirado ? <Button disabled={Boolean(processando)} variant="outline" onClick={() => removerConvite(item)}>Excluir convite expirado</Button> : <Button disabled={Boolean(processando)} variant="outline" onClick={() => reenviar(item.id)}>{processando === item.id ? 'Gerando…' : 'Gerar novo link'}</Button>}</div></article>})}</section>
      <section className="space-y-3"><h2 className="text-lg font-bold text-navy">Clientes cadastrados</h2>{feedbackExclusaoCliente && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{feedbackExclusaoCliente}</p>}{carregando ? null : clientes.length === 0 ? <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">Nenhum cliente aceitou um convite ainda.</p> : clientes.map((cliente) => <article key={cliente.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3">{cliente.fotoUrl && <img src={cliente.fotoUrl} alt={`Foto de ${cliente.nome}`} className="h-14 w-14 rounded-full object-cover" />}<div><h3 className="font-bold text-navy">{cliente.nome}</h3><p className="text-sm text-slate-600">{cliente.email}{cliente.telefone ? ` · ${cliente.telefone}` : ''}{cliente.telefoneSecundario ? ` · ${cliente.telefoneSecundario}` : ''}</p></div></div>{cliente.endereco && <p className="mt-2 text-sm text-slate-600">Endereço de contato: {cliente.endereco}</p>}<ul className="mt-3 space-y-1 text-sm">{cliente.obrasComoCliente.map((obra) => <li key={obra.id} className="flex justify-between gap-2 rounded bg-slate-50 px-3 py-2"><span>{obra.nome}</span><span className="text-slate-500">{obra.status}</span></li>)}</ul>{cliente.obrasComoCliente.length === 0 && <p className="mt-2 text-xs text-slate-500">Ainda não está vinculado a nenhuma obra.</p>}<div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => verInformacoes(cliente.id)}>Informações</Button><Button variant="outline" disabled={processando === `excluir-cliente-${cliente.id}`} className="border-red-300 text-red-800" onClick={() => removerCliente(cliente)}>{processando === `excluir-cliente-${cliente.id}` ? 'Excluindo…' : 'Excluir cliente'}</Button></div></article>)}</section>
      {/* Mostra o motivo da exclusão junto aos clientes sem confundi-lo com falha da lista. */}
      {Object.entries(erroExclusaoCliente).filter(([, erroCliente]) => erroCliente?.mensagem).map(([clienteId, erroCliente]) => {
        // Localiza o cliente para permitir uma nova tentativa somente enquanto ele segue listado.
        const cliente = clientes.find((item) => item.id === clienteId)
        // Exibe a mensagem específica retornada pela API.
        return <p key={clienteId} role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {/* Mantém visível o motivo exato informado pelo backend. */}
          {erroCliente.mensagem}
          {/* Só oferece repetição para falha de rede, servidor ou conflito recuperável. */}
          {erroCliente.podeTentarNovamente && cliente && <button type="button" className="ml-2 font-semibold underline" disabled={processando === `excluir-cliente-${clienteId}`} onClick={() => removerCliente(cliente)}>Tentar novamente</button>}
        </p>
      })}
    </main>
    {(carregandoDetalhes || detalhesCliente) && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Informações do cliente"><section className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-navy">Informações pessoais do cliente</h2><button type="button" onClick={() => setDetalhesCliente(null)} aria-label="Fechar" className="text-2xl">×</button></div>{carregandoDetalhes ? <p role="status" className="mt-4">Carregando…</p> : detalhesCliente && <><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-semibold">Nome</dt><dd>{detalhesCliente.nome}</dd></div><div><dt className="font-semibold">CPF</dt><dd>{detalhesCliente.cpf || 'Não informado'}</dd></div><div><dt className="font-semibold">E-mail</dt><dd>{detalhesCliente.email}</dd></div><div><dt className="font-semibold">Telefones</dt><dd>{[detalhesCliente.telefone, detalhesCliente.telefoneSecundario].filter(Boolean).join(' · ') || 'Não informado'}</dd></div><div className="sm:col-span-2"><dt className="font-semibold">Endereço pessoal</dt><dd>{nomeEndereco(detalhesCliente) || 'Não informado'}</dd></div><div className="sm:col-span-2"><dt className="font-semibold">Complemento</dt><dd>{detalhesCliente.complemento || 'Não informado'}</dd></div></dl><h3 className="mt-5 font-bold text-navy">Obras vinculadas</h3>{detalhesCliente.obrasComoCliente.map((obra) => <article key={obra.id} className="mt-2 rounded-lg bg-slate-50 p-3 text-sm"><strong>{obra.nome}</strong><p>{obra.status}</p><p className="text-slate-600">{nomeEndereco(obra)}</p></article>)}</>}</section></div>}
  </div>
}
