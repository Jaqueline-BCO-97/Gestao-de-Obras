import { useCallback, useEffect, useState } from 'react'
import Button from '../components/Button.jsx'
// Reutiliza o campo acessível de busca e seleção de obras nesta tela.
import ComboboxObraAtribuicao from '../components/ComboboxObraAtribuicao.jsx'
import { Link } from 'react-router-dom'
import { alocarFuncionarioObra, cancelarConviteGerente, encerrarEscala, moverGerente, convidarPessoa, listarFuncionarios, listarObras, listarConvites, reenviarConvite } from '../services/auth.js'
import useConfirmacao from '../components/useConfirmacao.jsx'
import { formatarTelefoneBR } from '../utils/telefone.js'
// Reutiliza a busca sem acentos e filtra status sem alterar os dados da API.
import { filtrarObrasAtribuiveis } from '../utils/obrasAtribuiveis.js'
// Reutiliza as regras pequenas do combobox e do botão nos testes de interação.
import { atribuicaoDesabilitada, criarEstadoBuscaAtribuicao, mensagemVaziaObrasAtribuicao } from '../utils/comboboxAtribuicao.js'

export default function AdminFuncionarios() {
  const { pedirConfirmacao, modal: modalConfirmacao } = useConfirmacao()
  const [funcionarios, setFuncionarios] = useState([])
  const [obras, setObras] = useState([])
  const [convites, setConvites] = useState([])
  const [form, setForm] = useState({ obraId: '', nome: '', email: '', telefone: '', funcao: 'Gerente de obras' })
  const [link, setLink] = useState('')
  const [erro, setErro] = useState('')
  const [erroLista, setErroLista] = useState('')
  const [erroAcao, setErroAcao] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState('')
  const [destinos, setDestinos] = useState({})
  // Guarda se a lista de atribuição está aberta para cada gerente.
  const [atribuicaoAberta, setAtribuicaoAberta] = useState({})
  // Guarda o texto digitado para filtrar obras em cada cartão de gerente.
  const [buscasAtribuicao, setBuscasAtribuicao] = useState({})
  // Guarda a obra escolhida em cada cartão de gerente.
  const [selecoesAtribuicao, setSelecoesAtribuicao] = useState({})
  // Guarda a confirmação ou o erro da última tentativa por gerente.
  const [feedbackAtribuicao, setFeedbackAtribuicao] = useState({})
  const convitesPendentes = convites.filter((convite) => convite.tipo === 'GERENTE' && !convite.usadoEm && new Date(convite.expiraEm) > new Date())

  const atualizar = useCallback(async () => {
    const [listaFuncionarios, listaObras, listaConvites] = await Promise.all([listarFuncionarios(), listarObras(), listarConvites()])
    setFuncionarios(listaFuncionarios)
    setObras(listaObras)
    setConvites(listaConvites)
    setErroLista('')
  }, [])

  useEffect(() => {
    let ativo = true
    Promise.all([listarFuncionarios(), listarObras(), listarConvites()])
      .then(([listaFuncionarios, listaObras, listaConvites]) => {
        if (ativo) { setFuncionarios(listaFuncionarios); setObras(listaObras); setConvites(listaConvites) }
      })
      .catch((falha) => { if (ativo) setErroLista(falha.message) })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [])

  async function convidar(event) {
    event.preventDefault(); setErro(''); setLink(''); setProcessando('convite')
    try {
      // Retira espaços nas pontas da função e mantém a obra opcional.
      const dadosConvite = { ...form, obraId: form.obraId || null, funcao: form.funcao.trim() }
      // Cria o convite de gerente com ou sem uma obra escolhida.
      const resposta = await convidarPessoa('gerente', dadosConvite)
      setLink(resposta.convite.link)
      setForm({ ...form, nome: '', email: '', telefone: '' })
      await atualizar()
    } catch (falha) { setErro(falha.message) }
    finally { setProcessando('') }
  }

  // Gera um novo link para qualquer convite de gerente que ainda esteja pendente.
  async function reenviar(id) {
    // Limpa o erro anterior da linha que está sendo processada.
    setErroAcao((atuais) => ({ ...atuais, [id]: '' }))
    // Marca o convite atual como em processamento.
    setProcessando(id)
    // Remove do painel o link antigo antes de solicitar o novo.
    setLink('')
    try {
      // Reenvia sem depender de a relação obra estar preenchida.
      const resposta = await reenviarConvite(id)
      // Mostra o novo link no mesmo painel de resultado do formulário.
      setLink(resposta.convite.link)
      // Atualiza a validade e os dados do convite listado.
      await atualizar()
    } catch (falha) {
      // Exibe o erro junto ao convite que não pôde ser reenviado.
      setErroAcao((atuais) => ({ ...atuais, [id]: falha.message }))
    } finally {
      // Libera os botões depois da resposta da API.
      setProcessando('')
    }
  }

  // Cancela um convite pendente depois de confirmar a ação com o ADMIN.
  async function cancelarConvite(convite) {
    // Pede confirmação antes de invalidar o link enviado ao gerente.
    if (!await pedirConfirmacao(`Cancelar o convite de ${convite.nome || 'gerente'}? O link deixará de funcionar.`)) return
    // Limpa erros anteriores e marca o convite em processamento.
    setErroAcao((atuais) => ({ ...atuais, [convite.id]: '' }))
    // Desativa as ações enquanto o cancelamento está sendo salvo.
    setProcessando(`cancelar-${convite.id}`)
    try {
      // Usa a rota DELETE já protegida por ADMIN e empresa.
      await cancelarConviteGerente(convite.id)
      // Remove o cartão imediatamente depois da confirmação do backend.
      setConvites((atuais) => atuais.filter((item) => item.id !== convite.id))
      // Sincroniza as listas completas e reserva o botão de repetição para falha de consulta.
      await atualizar().catch((falha) => setErroLista(falha.message))
    } catch (falha) {
      // Mostra a mensagem real do backend junto ao convite correspondente.
      setErroAcao((atuais) => ({ ...atuais, [convite.id]: falha.message }))
    } finally {
      // Libera os controles depois do resultado da solicitação.
      setProcessando('')
    }
  }

  async function removerAcesso(escala, nomeFuncionario) {
    if (!await pedirConfirmacao(`Remover ${nomeFuncionario} desta obra? O histórico da escala será mantido.`)) return
    setErroAcao((atuais) => ({ ...atuais, [escala.id]: '' })); setProcessando(escala.id)
    try { await encerrarEscala(escala.obra.id, escala.id, 'Acesso encerrado pela empreiteira'); await atualizar() }
    catch (falha) { setErroAcao((atuais) => ({ ...atuais, [escala.id]: falha.message })) }
    finally { setProcessando('') }
  }

  async function moverAcesso(escala) {
    const novaObraId = destinos[escala.id]
    if (!novaObraId) { setErroAcao((atuais) => ({ ...atuais, [escala.id]: 'Selecione a nova obra antes de mover o gerente.' })); return }
    setErroAcao((atuais) => ({ ...atuais, [escala.id]: '' })); setProcessando(escala.id)
    try { await moverGerente(escala.obra.id, escala.id, novaObraId); await atualizar(); setDestinos((atuais) => ({ ...atuais, [escala.id]: '' })) }
    catch (falha) { setErroAcao((atuais) => ({ ...atuais, [escala.id]: falha.message })) }
    finally { setProcessando('') }
  }

  // Adiciona o gerente à obra usando a rota e as validações que já existem.
  async function atribuirObra(funcionario) {
    // Lê a obra escolhida neste cartão sem alterar as escalas atuais.
    const obraId = selecoesAtribuicao[funcionario.id]
    // Pede uma seleção quando o administrador ainda não escolheu uma obra.
    if (!obraId) {
      setFeedbackAtribuicao((atuais) => ({ ...atuais, [funcionario.id]: { tipo: 'erro', texto: 'Selecione uma obra para atribuir.' } }))
      return
    }
    // Limpa a mensagem anterior antes de chamar a API.
    setFeedbackAtribuicao((atuais) => ({ ...atuais, [funcionario.id]: null }))
    // Marca o gerente atual como em processamento.
    setProcessando(funcionario.id)
    try {
      // Reutiliza alocarFuncionarioObra para adicionar uma escala sem remover as anteriores.
      await alocarFuncionarioObra(obraId, funcionario.id)
      // Atualiza funcionários e obras sem recarregar a página.
      await atualizar()
      // Fecha a lista depois que a API confirmar a atribuição.
      setAtribuicaoAberta((atuais) => ({ ...atuais, [funcionario.id]: false }))
      // Limpa a seleção antiga para evitar atribuição repetida acidental.
      setSelecoesAtribuicao((atuais) => ({ ...atuais, [funcionario.id]: '' }))
      // Limpa também o texto mostrado no campo depois da atribuição confirmada.
      setBuscasAtribuicao((atuais) => ({ ...atuais, [funcionario.id]: '' }))
      // Confirma que o novo acesso foi salvo.
      setFeedbackAtribuicao((atuais) => ({ ...atuais, [funcionario.id]: { tipo: 'sucesso', texto: 'Obra atribuída ao gerente.' } }))
    } catch (falha) {
      // Mantém as mensagens de validação em português devolvidas pelo backend.
      setFeedbackAtribuicao((atuais) => ({ ...atuais, [funcionario.id]: { tipo: 'erro', texto: falha.message } }))
    } finally {
      // Libera os controles depois do sucesso ou do erro.
      setProcessando('')
    }
  }

  // Abre ou fecha a lista de obras do gerente escolhido.
  function alternarAtribuicao(funcionarioId) {
    // Alterna somente o cartão que recebeu o clique.
    setAtribuicaoAberta((atuais) => ({ ...atuais, [funcionarioId]: !atuais[funcionarioId] }))
    // Limpa uma mensagem anterior ao abrir novamente a lista.
    setFeedbackAtribuicao((atuais) => ({ ...atuais, [funcionarioId]: null }))
  }

  // Atualiza o texto de busca de um gerente sem afetar outros cartões.
  function atualizarBuscaAtribuicao(funcionarioId, busca) {
    // Prepara o texto novo e remove a escolha anterior antes de atualizar a tela.
    const novoEstado = criarEstadoBuscaAtribuicao(busca)
    // Guarda a busca para ser normalizada pelo filtro de obras.
    setBuscasAtribuicao((atuais) => ({ ...atuais, [funcionarioId]: novoEstado.busca }))
    // Limpa uma obra anterior que pode não corresponder à busca nova.
    setSelecoesAtribuicao((atuais) => ({ ...atuais, [funcionarioId]: novoEstado.obraId }))
  }

  // Guarda a obra escolhida e mostra seu nome no mesmo campo de busca.
  function selecionarObraAtribuicao(funcionarioId, obra) {
    // Atualiza somente a seleção do gerente atual.
    setSelecoesAtribuicao((atuais) => ({ ...atuais, [funcionarioId]: obra.id }))
    // Substitui a busca pelo nome da obra escolhida no combobox.
    setBuscasAtribuicao((atuais) => ({ ...atuais, [funcionarioId]: obra.titulo || obra.nome }))
  }

  return <div className="min-h-screen bg-background text-ink">{modalConfirmacao}

    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div><h1 className="text-3xl font-bold text-navy">Gerentes de obra</h1><p className="mt-1 text-sm text-slate-600">Convide responsáveis com acesso e gerencie o vínculo ativo de cada gerente.</p><Link to="/admin/funcionarios" className="mt-2 inline-block text-sm font-semibold text-sky-700 underline">Abrir cadastro de funcionários sem acesso →</Link></div>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Convidar gerente</h2><p className="mt-1 text-sm text-slate-600">O convite pode ser enviado sem obra. Se informar uma obra, o gerente terá acesso a ela depois de aceitar.</p>
        <form onSubmit={convidar} className="mt-4 grid gap-3 sm:grid-cols-2">
          {/* Permite deixar o gerente sem obra para a administração vincular depois. */}
          <label className="text-sm">Obra<select value={form.obraId} onChange={(e) => setForm({ ...form, obraId: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2"><option value="">Selecione uma obra (opcional)</option>{obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.titulo}</option>)}</select><span className="mt-1 block text-xs text-slate-600">Opcional: você pode vincular a obra depois</span></label>
          {/* Mantém os campos de identificação obrigatórios do convite. */}
          <label className="text-sm">Nome completo<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
          {/* Solicita o endereço que receberá o link único. */}
          <label className="text-sm">E-mail<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
          {/* Mantém a formatação telefônica existente. */}
          <label className="text-sm">Telefone<input required type="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: formatarTelefoneBR(e.target.value) })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
          {/* Mantém a função como texto livre com limite compatível com a API. */}
          <label className="text-sm">Função<input required maxLength={100} value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
          {/* Exibe os erros retornados ao criar o convite. */}
          {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800 sm:col-span-2">{erro}</p>}
          {/* Permite criar o convite mesmo sem nenhuma obra cadastrada. */}
          <Button disabled={processando === 'convite'} type="submit" className="sm:col-span-2">{processando === 'convite' ? 'Gerando…' : 'Gerar convite único'}</Button>
        </form>
        {link && <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><p>Link válido por 48 horas. Copie e envie ao gerente:</p><input readOnly value={link} onFocus={(e) => e.target.select()} className="mt-2 w-full rounded border border-emerald-200 bg-white p-2" /></div>}
      </section>
      {/* Lista os convites pendentes e gerentes que já receberam acesso. */}
      <section className="space-y-3">
        {/* Identifica a seção de convites que ainda podem ser aceitos. */}
        <h2 className="text-lg font-bold text-navy">Gerentes com convite pendente</h2>
        {/* Exibe erros ao consultar novamente os dados do admin. */}
        {erroLista && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erroLista} <button type="button" className="font-semibold underline" onClick={() => atualizar().catch((falha) => setErroLista(falha.message))}>Tentar novamente</button></p>}
        {/* Mantém o reenvio dos convites pendentes, inclusive sem obra vinculada. */}
        {convitesPendentes.map((convite) => (
          // Mostra os campos conhecidos do convite e protege relações vazias.
          <article key={convite.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
            {/* Usa um nome neutro se o convite antigo não tiver nome. */}
            <h3 className="font-bold text-amber-900">{convite.nome || 'Gerente'} · Convite pendente</h3>
            {/* Mostra um fallback claro quando o convite não tem obra associada. */}
            <p className="mt-1 text-amber-800">{convite.email || 'E-mail não informado'} · {convite.obra?.nome || 'Sem obra vinculada'} · {convite.funcao || 'Definida pela administração da empresa'}</p>
            {/* Exibe falhas de reenvio junto ao convite correspondente. */}
            {erroAcao[convite.id] && <p role="alert" className="mt-2 rounded bg-red-50 p-2 text-sm font-semibold text-red-800">{erroAcao[convite.id]}</p>}
            {/* Gera um link novo sem depender da obra do convite. */}
            <Button variant="outline" disabled={Boolean(processando)} onClick={() => reenviar(convite.id)} className="mt-3 px-3 py-1.5 text-xs">{processando === convite.id ? 'Gerando…' : 'Gerar novo link'}</Button>
            {/* Cancela o convite pendente sem alterar a identidade visual atual. */}
            <Button variant="outline" disabled={Boolean(processando)} onClick={() => cancelarConvite(convite)} className="mt-3 ml-2 px-3 py-1.5 text-xs">{processando === `cancelar-${convite.id}` ? 'Cancelando…' : 'Cancelar convite'}</Button>
          </article>
        ))}
        {/* Informa que os dados ainda estão sendo carregados. */}
        {carregando ? <p role="status" className="text-sm text-slate-500">Carregando…</p> : funcionarios.filter((item) => item.usuarioId).length === 0 ? <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">Ainda não há gerentes com convite aceito.</p> : funcionarios.filter((item) => item.usuarioId).map((funcionario) => {
          // Garante que a lista de escalas seja utilizável em cada cartão.
          const escalasFuncionario = Array.isArray(funcionario.escalas) ? funcionario.escalas : []
          // Filtra as obras ainda disponíveis para o gerente atual.
          const obrasDisponiveis = filtrarObrasAtribuiveis(obras, funcionario, buscasAtribuicao[funcionario.id])
          // Conta as obras elegíveis sem aplicar o texto digitado.
          const quantidadeObrasElegiveis = filtrarObrasAtribuiveis(obras, funcionario, '').length
          // Escolhe a mensagem correta caso o combobox não tenha opções.
          const mensagemListaVazia = mensagemVaziaObrasAtribuicao(quantidadeObrasElegiveis)
          // Lê a mensagem atual de sucesso ou erro para este gerente.
          const feedbackAtual = feedbackAtribuicao[funcionario.id]
          // Verifica se este gerente tem o seletor aberto.
          const seletorAberto = Boolean(atribuicaoAberta[funcionario.id])
          // Libera a ação somente para funcionário de nível Responsável.
          const podeAtribuirObra = funcionario.nivel === 'RESPONSAVEL'
          // Renderiza o cartão do gerente sem alterar as obras já vinculadas.
          return (
            // Agrupa os dados do perfil e todos os acessos ativos do gerente.
            <article key={funcionario.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              {/* Mostra a foto, o nome e a função que vieram da API. */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Mantém a identidade existente do gerente. */}
                <div className="flex items-center gap-3">
                  {/* Exibe a foto salva quando houver uma disponível. */}
                  {(funcionario.fotoUrl || funcionario.usuario?.fotoUrl) && <img src={funcionario.fotoUrl || funcionario.usuario?.fotoUrl} alt={`Foto de ${funcionario.nome}`} className="h-14 w-14 rounded-full object-cover" />}
                  {/* Exibe os dados textuais do gerente. */}
                  <div>
                    {/* Mostra o nome do funcionário. */}
                    <h3 className="font-bold text-navy">{funcionario.nome}</h3>
                    {/* Mantém visíveis conta, função, nível e situação atual. */}
                    <p className="text-sm text-slate-600">{funcionario.usuario?.email || 'Conta de acesso'}{funcionario.telefone ? ` · ${funcionario.telefone}` : ''} · {funcionario.funcao} · {funcionario.nivel === 'RESPONSAVEL' ? 'Gerente responsável' : 'Apoio'}{!funcionario.ativo && ' · Inativo'}</p>
                  </div>
                </div>
              </div>
              {/* Mostra as escalas atuais sem remover nenhuma ao atribuir outra obra. */}
              <div className="mt-4 space-y-2">
                {/* Mantém as ações de mover e remover para cada obra já vinculada. */}
                {escalasFuncionario.length ? escalasFuncionario.map((escala) => (
                  // Renderiza cada escala aberta do gerente.
                  <div key={escala.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    {/* Agrupa o nome da obra e as ações atuais da escala. */}
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      {/* Mostra o nome da obra sem alterar o alinhamento das ações. */}
                      <span><strong>{escala.obra.nome}</strong></span>
                      {/* Mantém os controles Mover e Remover alinhados em todas as linhas. */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Conserva a escolha de obra e a ação de mover já existentes. */}
                        <select aria-label={`Mover ${funcionario.nome} de ${escala.obra.nome} para`} value={destinos[escala.id] || ''} onChange={(e) => setDestinos({ ...destinos, [escala.id]: e.target.value })} className="rounded border border-slate-300 p-1.5 text-xs"><option value="">Mover para…</option>{obras.filter((obra) => obra.id !== escala.obra.id).map((obra) => <option key={obra.id} value={obra.id}>{obra.titulo}</option>)}</select>
                        {/* Move a escala pela ação atual sem mudar sua regra. */}
                        <Button variant="outline" disabled={Boolean(processando) || !destinos[escala.id]} onClick={() => moverAcesso(escala)} className="px-3 py-1.5 text-xs">Mover</Button>
                        {/* Mantém a opção de encerrar acesso já existente. */}
                        <Button variant="outline" disabled={Boolean(processando)} onClick={() => removerAcesso(escala, funcionario.nome)} className="px-3 py-1.5 text-xs">{processando === escala.id ? 'Salvando…' : 'Remover acesso'}</Button>
                      </div>
                    </div>
                    {/* Mostra falhas já associadas às ações desta escala. */}
                    {erroAcao[escala.id] && <p role="alert" className="mt-2 rounded bg-red-50 p-2 text-sm font-semibold text-red-800">{erroAcao[escala.id]}</p>}
                  </div>
                )) : (
                  // Mostra o gerente sem escala antes de oferecer a nova atribuição.
                  // Informa que o gerente ainda não tem obra atribuída.
                  <p className="text-sm text-slate-500">Sem obra atribuída atualmente.</p>
                )}
                {/* Coloca um único botão depois da última obra ou da mensagem vazia. */}
                {podeAtribuirObra && <Button variant="outline" disabled={Boolean(processando)} onClick={() => alternarAtribuicao(funcionario.id)} className="px-3 py-1.5 text-xs">Atribuir obra</Button>}
                {/* Apresenta o combobox e o envio quando o gerente abre a atribuição. */}
                {podeAtribuirObra && seletorAberto && (
                  // Envia a nova escala pela mesma operação usada na tela de obra.
                  <form onSubmit={(event) => { event.preventDefault(); atribuirObra(funcionario) }} className="space-y-2 rounded-lg border border-slate-200 p-3">
                    {/* Busca e escolhe uma obra elegível no mesmo combobox. */}
                    <ComboboxObraAtribuicao
                      id={`obra-atribuicao-${funcionario.id}`}
                      obras={obrasDisponiveis}
                      busca={buscasAtribuicao[funcionario.id] || ''}
                      obraSelecionadaId={selecoesAtribuicao[funcionario.id] || ''}
                      mensagemVazia={mensagemListaVazia}
                      aoBuscar={(busca) => atualizarBuscaAtribuicao(funcionario.id, busca)}
                      aoSelecionar={(obra) => selecionarObraAtribuicao(funcionario.id, obra)}
                    />
                    {/* Mostra a resposta retornada pelo backend sem traduzir seus erros. */}
                    {feedbackAtual && <p role={feedbackAtual.tipo === 'erro' ? 'alert' : 'status'} className={`rounded-lg p-2 text-sm font-semibold ${feedbackAtual.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{feedbackAtual.texto}</p>}
                    {/* Exige uma seleção da lista antes de enviar a atribuição. */}
                    <Button type="submit" disabled={atribuicaoDesabilitada(selecoesAtribuicao[funcionario.id], processando)} className="px-3 py-1.5 text-xs">{processando === funcionario.id ? 'Atribuindo…' : 'Atribuir'}</Button>
                  </form>
                )}
                {/* Mantém a mensagem de sucesso visível depois que a lista fecha. */}
                {!seletorAberto && feedbackAtual && <p role={feedbackAtual.tipo === 'erro' ? 'alert' : 'status'} className={`rounded-lg p-2 text-sm font-semibold ${feedbackAtual.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{feedbackAtual.texto}</p>}
              </div>
            </article>
          )
        })}
      </section>
    </main>
  </div>
}
