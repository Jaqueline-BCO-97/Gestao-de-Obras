import Button from '../components/Button.jsx'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
// Reutiliza a lista compacta de parcelas também no formulário de edição.
import SelectQuantidadeParcelas from '../components/SelectQuantidadeParcelas.jsx'
import { alocarFuncionarioObra, anexarFotoNovaObra, arquivarObra, atualizarObra, buscarObra, confirmarPrimeiraParcela, encerrarAlocacaoObra, iniciarExecucaoObra, listarAlocacoesObra, registrarAndamentoObra, solicitarConferenciaObra } from '../services/auth.js'
import useConfirmacao from '../components/useConfirmacao.jsx'
// Importa o componente padronizado de resumo de parcelas (título "Parcelas", sem parênteses, até 2 linhas).
import ResumoParcelas from '../components/ResumoParcelas.jsx'
// Preserva o formato inicial e numérico usado pelos payloads existentes da obra.
import { deveBloquearEdicaoFinanceira, normalizarQuantidadeParcelas, obterQuantidadeInicialObra } from '../utils/quantidadeParcelas.js'
// Reutiliza a regra única ao bloquear funções já usadas na equipe da obra.
import { normalizarFuncaoComparacao } from '../utils/funcao.js'

function moeda(valor) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0)) }
function moedaEntrada(valor) { const digitos = String(valor).replace(/\D/g, ''); return digitos ? (Number(digitos) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '' }
function moedaNormalizada(valor) { return String(valor).replace(/\./g, '').replace(',', '.') }
function arquivoEmDataURL(arquivo) { return new Promise((resolve, reject) => { const leitor = new FileReader(); leitor.onload = () => resolve({ data: leitor.result, mimeType: arquivo.type }); leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo selecionado.')); leitor.readAsDataURL(arquivo) }) }

export default function AdminObra() {
  const { pedirConfirmacao, modal: modalConfirmacao } = useConfirmacao()
  const { id } = useParams()
  const navigate = useNavigate()
  const [obra, setObra] = useState(null)
  const [escalas, setEscalas] = useState({ alocacoesAbertas: [], historico: [] })
  const [selecoesGerentes, setSelecoesGerentes] = useState([''])
  const [form, setForm] = useState(null)
  const [descricao, setDescricao] = useState('')
  const [tipoRegistro, setTipoRegistro] = useState('ANOTACAO')
  const [fotoRegistro, setFotoRegistro] = useState(null)
  const [fotoObra, setFotoObra] = useState(null)
  const [visivel, setVisivel] = useState(true)
  const [motivo, setMotivo] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [feedback, setFeedback] = useState({})
  const [erroFoto, setErroFoto] = useState('')
  const [erroArquivar, setErroArquivar] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [alocandoGerente, setAlocandoGerente] = useState(false)

  function preencherForm(dados) {
    // Preenche os dados editáveis e mantém a quantidade atual no formato string do controle.
    setForm({ nome: dados.titulo || '', descricao: dados.descricao || '', estado: dados.estado || '', cidade: dados.cidade || '', bairro: dados.bairro || '', endereco: dados.enderecoBase || '', numero: dados.numero || '', semApartamento: dados.semApartamento || false, apartamento: dados.apartamento || '', semBloco: dados.semBloco || false, bloco: dados.bloco || '', prazoFinal: dados.prazoISO || '', quantidadeParcelas: obterQuantidadeInicialObra(dados), vencimentoInicial: dados.parcelas?.[0]?.vencimentoISO || '', valorTotal: Number(dados.valorBase ?? dados.valorTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), informacoesAdicionais: dados.informacoesAdicionais || '' })
  }

  async function recarregar() {
    const [dados, dadosEscalas] = await Promise.all([buscarObra(id), listarAlocacoesObra(id)])
    setObra(dados); setEscalas(dadosEscalas); preencherForm(dados)
  }

  function informarFeedback(area, tipo, texto) { setFeedback((atual) => ({ ...atual, [area]: { tipo, texto } })) }
  function limparFeedback(area) { setFeedback((atual) => ({ ...atual, [area]: null })) }

  useEffect(() => {
    let ativo = true
    Promise.all([buscarObra(id), listarAlocacoesObra(id)]).then(([dados, dadosEscalas]) => { if (ativo) { setObra(dados); setEscalas(dadosEscalas); preencherForm(dados) } }).catch((falha) => { if (ativo) setErro(falha.message) }).finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [id])

  async function executar(acao, mensagem, area = 'operacao') {
    limparFeedback(area); setSalvando(true)
    try { await acao(); await recarregar(); informarFeedback(area, 'sucesso', mensagem) }
    catch (falha) { informarFeedback(area, 'erro', falha.message) }
    finally { setSalvando(false) }
  }

  async function salvarDados(event) {
    event.preventDefault(); limparFeedback('dados')
    if (!form.quantidadeParcelas) { informarFeedback('dados', 'erro', 'Selecione a quantidade de parcelas.'); return }
    if (!/^\d+$/.test(form.numero) || (!form.semApartamento && !/^\d+$/.test(form.apartamento)) || (!form.semBloco && !/^[a-z\d]+$/i.test(form.bloco))) { informarFeedback('dados', 'erro', 'Número e apartamento aceitam apenas números; bloco aceita letras e números.'); return }
    const valor = moedaNormalizada(form.valorTotal)
    if (!/^\d+(?:\.\d{1,2})?$/.test(valor) || Number(valor) <= 0) { informarFeedback('dados', 'erro', 'Informe um valor positivo com até duas casas decimais.'); return }
    // Converte a quantidade para número mantendo o payload original da edição.
    await executar(() => atualizarObra(id, { ...form, valorTotal: valor, quantidadeParcelas: normalizarQuantidadeParcelas(form.quantidadeParcelas), vencimentoInicial: form.vencimentoInicial }), 'Dados da obra atualizados.', 'dados')
  }

  async function salvarFotoObra(event) {
    event.preventDefault(); setErroFoto('')
    if (!fotoObra) { setErroFoto('Selecione a foto da obra.'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(fotoObra.type) || fotoObra.size > 5 * 1024 * 1024) { setErroFoto('Use JPG, PNG ou WebP de até 5 MB.'); return }
    setSalvando(true)
    try { await anexarFotoNovaObra(id, await arquivoEmDataURL(fotoObra)); setFotoObra(null); await recarregar(); setErroFoto(''); informarFeedback('foto', 'sucesso', 'Foto adicionada à obra.') }
    catch (falha) { setErroFoto(falha.message) }
    finally { setSalvando(false) }
  }

  async function registrarNota(event) {
    event.preventDefault(); limparFeedback('andamento')
    if (!descricao.trim()) { informarFeedback('andamento', 'erro', 'Escreva uma atualização antes de salvar.'); return }
    if (fotoRegistro && (!['image/jpeg', 'image/png', 'image/webp'].includes(fotoRegistro.type) || fotoRegistro.size > 5 * 1024 * 1024)) { informarFeedback('andamento', 'erro', 'Escolha uma foto JPG, PNG ou WebP de até 5 MB.'); return }
    setSalvando(true)
    try { await registrarAndamentoObra(id, descricao.trim(), tipoRegistro, fotoRegistro ? await arquivoEmDataURL(fotoRegistro) : null, visivel); setDescricao(''); setFotoRegistro(null); await recarregar(); informarFeedback('andamento', 'sucesso', 'Atualização registrada no histórico.') }
    catch (falha) { informarFeedback('andamento', 'erro', falha.message) }
    finally { setSalvando(false) }
  }

  async function removerAcesso(alocacao) {
    if (!await pedirConfirmacao(`Encerrar o acesso de ${alocacao.funcionario?.nome || 'este gerente'} a esta obra?`)) return
    await executar(() => encerrarAlocacaoObra(id, alocacao.id, 'Acesso encerrado pela empreiteira'), 'Acesso encerrado. O histórico foi mantido.', 'equipe')
  }

  async function confirmarRecebimento() {
    if (!await pedirConfirmacao('Confirma que a empreiteira recebeu a primeira parcela?')) return
    await executar(() => confirmarPrimeiraParcela(id), 'Recebimento da primeira parcela confirmado.')
  }

  async function adicionarGerentes(event) {
    event.preventDefault()
    const escolhidos = selecoesGerentes.filter(Boolean)
    if (!escolhidos.length) { informarFeedback('equipe', 'erro', 'Escolha ao menos um gerente para adicionar.'); return }
    setAlocandoGerente(true); limparFeedback('equipe')
    try {
      for (const funcionarioId of escolhidos) await alocarFuncionarioObra(id, funcionarioId)
      setSelecoesGerentes(['']); await recarregar(); informarFeedback('equipe', 'sucesso', 'Gerente(s) adicionado(s) à obra.')
    } catch (falha) { informarFeedback('equipe', 'erro', falha.message); await recarregar() }
    finally { setAlocandoGerente(false) }
  }

  async function arquivar(event) {
    event.preventDefault(); setErroArquivar('')
    if (!await pedirConfirmacao('A obra ficará recuperável por sete dias. Deseja arquivar?')) return
    setSalvando(true)
    try { await arquivarObra(id, senha, motivo); navigate('/admin/obras', { replace: true }) }
    catch (falha) { setErroArquivar(falha.message) }
    finally { setSalvando(false) }
  }

  if (carregando) return <main className="min-h-screen bg-background p-8 text-center text-slate-600" role="status">Carregando obra…</main>
  if (!obra || !form) return <main className="min-h-screen bg-background p-8"><Link to="/admin/obras">← Voltar para obras</Link><h1 className="mt-5 text-2xl font-bold text-navy">Obra não encontrada</h1>{erro && <p role="alert" className="mt-3 text-red-700">{erro}</p>}</main>

  const primeiraPaga = obra.parcelas?.[0]?.situacao === 'paga' || obra.parcela1?.situacao === 'paga'
  const parcelas = obra.parcelas || [obra.parcela1, obra.parcela2].filter(Boolean)
  const conviteClientePendente = Boolean(obra.conviteClientePendente)
  const parcelaPaga = parcelas.some((parcela) => parcela.situacao === 'paga')
  const pagamentoEmProcessamento = parcelas.some((parcela) => parcela.tentativasPendentes?.length)
  // Aplica a mesma regra de bloqueio aos campos de valor base e quantidade de parcelas.
  const edicaoFinanceiraBloqueada = deveBloquearEdicaoFinanceira(parcelas)
  // Mantém a explicação já usada pelo backend para alterações financeiras bloqueadas.
  const explicacaoBloqueioParcelas = 'Valor, quantidade e vencimentos não podem mudar depois de iniciada uma tentativa ou confirmado um pagamento'
  const totalComJuros = form.quantidadeParcelas ? Number(moedaNormalizada(form.valorTotal || '0')) * (1 + (Number(form.quantidadeParcelas) > 12 ? 0.01 * (Number(form.quantidadeParcelas) - 12) : 0)) : null
  const bloqueioArquivamento = obra.status !== 'Agendada' ? 'Somente obras agendadas podem ser arquivadas; obras em execução devem seguir o fluxo de conferência e aceite do cliente.' : parcelaPaga ? 'Esta obra tem parcela paga e não pode ser arquivada.' : pagamentoEmProcessamento ? 'Esta obra tem pagamento em processamento e não pode ser arquivada.' : ''
  // Compara as funções atuais sem alterar o texto mostrado ao administrador.
  const funcoesAlocadas = new Set(escalas.alocacoesAbertas.map((item) => normalizarFuncaoComparacao(item.funcionario.funcao)))
  const idsEscolhidos = new Set(selecoesGerentes.filter(Boolean))
  const gerentesElegiveis = (escalas.gerentesDisponiveis || []).filter((item) => !escalas.alocacoesAbertas.some((alocacao) => alocacao.funcionario.id === item.id))
  return <div className="min-h-screen bg-background text-ink">{modalConfirmacao}
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8"><Link to="/admin/obras" className="text-sm font-semibold text-sky-700">← Voltar para Gestão de Obras</Link>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-navy">{obra.titulo}</h1><p className="mt-1 text-sm text-slate-600">Cliente: {obra.cliente || 'Ainda não vinculado'} · Status: <strong>{obra.status}</strong></p></div><div className="flex flex-wrap gap-2">{obra.status === 'Agendada' && (primeiraPaga ? <Button disabled={salvando || conviteClientePendente} onClick={() => executar(() => iniciarExecucaoObra(id), 'Execução iniciada.')}>Iniciar execução da obra</Button> : <Button variant="outline" disabled={salvando || conviteClientePendente} onClick={confirmarRecebimento}>Confirmar primeira parcela recebida</Button>)}{obra.status === 'Em andamento' && <Button disabled={salvando} onClick={() => executar(() => solicitarConferenciaObra(id), 'Obra enviada para conferência do cliente.')}>Solicitar conferência</Button>}</div>{feedback.operacao && <p role={feedback.operacao.tipo === 'erro' ? 'alert' : 'status'} className={`w-full rounded-lg p-3 text-sm font-semibold ${feedback.operacao.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{feedback.operacao.texto}</p>}{obra.status === 'Agendada' && conviteClientePendente && <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">O cliente ainda não aceitou o convite. A primeira parcela não pode ser confirmada e a execução não pode começar.</p>}</div><div className="mt-5 grid items-start gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><p><strong>Endereço</strong><br />{obra.endereco || 'Não informado'}</p><p><strong>Prazo</strong><br />{obra.prazo || 'Não informado'}</p><p><strong>Valor total</strong><br />{moeda(obra.valorTotal)}</p>{/* Exibe o resumo padronizado com todas as parcelas completas do detalhe da obra */}<ResumoParcelas obra={obra} origem="parcelas" compacto /></div></section>

      <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Dados da obra</h2><form onSubmit={salvarDados} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">Nome da obra<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
        <label className="text-sm sm:col-span-2">Descrição<textarea required rows="3" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
        <label className="text-sm">Estado<input required value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Cidade<input required value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
        <label className="text-sm">Bairro<input required value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Rua ou avenida<input required value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
        <label className="text-sm">Número<input required inputMode="numeric" pattern="[0-9]+" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value.replace(/\D/g, '') })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
        <label className="text-sm">Apartamento<input disabled={form.semApartamento} required={!form.semApartamento} inputMode="numeric" pattern="[0-9]+" value={form.apartamento} onChange={(e) => setForm({ ...form, apartamento: e.target.value.replace(/\D/g, '') })} className="mt-1 w-full rounded border border-slate-300 p-2 disabled:bg-slate-100" /><span className="mt-1 flex items-center gap-2 text-xs"><input type="checkbox" checked={form.semApartamento} onChange={(e) => setForm({ ...form, semApartamento: e.target.checked, apartamento: '' })} />Não existe apartamento</span></label>
        <label className="text-sm">Bloco<input disabled={form.semBloco} required={!form.semBloco} pattern="[A-Za-z0-9]+" value={form.bloco} onChange={(e) => setForm({ ...form, bloco: e.target.value.replace(/[^a-z\d]/gi, '') })} className="mt-1 w-full rounded border border-slate-300 p-2 disabled:bg-slate-100" /><span className="mt-1 flex items-center gap-2 text-xs"><input type="checkbox" checked={form.semBloco} onChange={(e) => setForm({ ...form, semBloco: e.target.checked, bloco: '' })} />Não existe bloco</span></label>
        <label className="text-sm">Prazo final<input required type="date" value={form.prazoFinal} onChange={(e) => setForm({ ...form, prazoFinal: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
        {/* Mantém o valor base da obra no formulário e no payload atual do PATCH. */}
        <label className="text-sm">
          {/* Identifica o valor base que pode ser editado antes de qualquer pagamento. */}
          Valor base (R$)
          {/* Preserva o valor controlado e desabilita a edição quando há pagamento. */}
          <input
            required
            inputMode="decimal"
            placeholder="40.000,25"
            value={form.valorTotal}
            onChange={(e) => setForm({ ...form, valorTotal: moedaEntrada(e.target.value) })}
            disabled={edicaoFinanceiraBloqueada}
            className="mt-1 w-full rounded border border-slate-300 p-2 disabled:bg-slate-100"
          />
          {/* Mostra junto ao campo a mesma explicação usada na quantidade de parcelas. */}
          {edicaoFinanceiraBloqueada && (
            <span className="mt-1 block text-xs text-slate-500">{explicacaoBloqueioParcelas}</span>
          )}
        </label>
        {/* Mantém a lista de parcelas existente e usa a mesma trava do valor base. */}
        <div className="text-sm">
          {/* Preserva o rótulo acessível do seletor de quantidade. */}
          <label htmlFor="quantidade-parcelas-edicao">Quantidade de parcelas</label>
          {/* Reinicia a lista quando o estado de bloqueio financeiro muda. */}
          <SelectQuantidadeParcelas
            key={edicaoFinanceiraBloqueada ? 'bloqueada' : 'liberada'}
            id="quantidade-parcelas-edicao"
            value={form.quantidadeParcelas}
            disabled={edicaoFinanceiraBloqueada}
            disabledReason={edicaoFinanceiraBloqueada ? explicacaoBloqueioParcelas : ''}
            onChange={(quantidadeParcelas) => setForm({ ...form, quantidadeParcelas })}
          />
        </div>
        <label className="text-sm">Vencimento da primeira parcela<input required type="date" value={form.vencimentoInicial} onChange={(e) => setForm({ ...form, vencimentoInicial: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><p className="text-sm text-slate-600 sm:col-span-2">Valor final estimado: <strong>{totalComJuros === null ? '—' : moeda(totalComJuros)}</strong>. Até 12 parcelas sem juros; acima disso, acréscimo simples de 1% por parcela além da 12ª.</p>
        <label className="text-sm sm:col-span-2">Serviços, materiais e medidas previstos<textarea required rows="4" value={form.informacoesAdicionais} onChange={(e) => setForm({ ...form, informacoesAdicionais: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>{feedback.dados && <p role={feedback.dados.tipo === 'erro' ? 'alert' : 'status'} className={`rounded-lg p-3 text-sm font-semibold sm:col-span-2 ${feedback.dados.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{feedback.dados.texto}</p>}<Button type="submit" disabled={salvando} className="sm:col-span-2">Salvar alterações</Button>
      </form></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Equipe com acesso</h2><p className="mt-1 text-xs text-slate-500">Adicione gerentes que já têm conta. Cada gerente desta obra precisa ter uma função diferente.</p>{feedback.equipe && <p role={feedback.equipe.tipo === 'erro' ? 'alert' : 'status'} className={`mt-3 rounded-lg p-3 text-sm font-semibold ${feedback.equipe.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{feedback.equipe.texto}</p>}<div className="mt-4 space-y-2">{escalas.alocacoesAbertas.map((alocacao) => <div key={alocacao.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span><strong>{alocacao.funcionario.nome}</strong> · {alocacao.funcionario.funcao} · desde {new Date(alocacao.dataInicio).toLocaleDateString('pt-BR')}</span><Button variant="outline" disabled={salvando || alocandoGerente} onClick={() => removerAcesso(alocacao)} className="px-3 py-1.5 text-xs">Remover acesso</Button></div>)}{escalas.alocacoesAbertas.length === 0 && <p className="text-sm text-slate-500">Nenhum gerente tem acesso ativo nesta obra.</p>}</div><form onSubmit={adicionarGerentes} className="mt-4 space-y-3 border-t border-slate-100 pt-4">{selecoesGerentes.map((funcionarioId, indice) => { const funcaoEscolhida = normalizarFuncaoComparacao(gerentesElegiveis.find((item) => item.id === funcionarioId)?.funcao); return <label key={indice} className="block text-sm">Gerente {indice + 1}<select required value={funcionarioId} onChange={(event) => setSelecoesGerentes((atual) => atual.map((valor, posicao) => posicao === indice ? event.target.value : valor))} className="mt-1 w-full rounded border border-slate-300 p-2"><option value="">Selecione nome e função</option>{gerentesElegiveis.filter((item) => !idsEscolhidos.has(item.id) || item.id === funcionarioId).map((item) => { const funcao = normalizarFuncaoComparacao(item.funcao); const usada = funcoesAlocadas.has(funcao) || (funcaoEscolhida !== funcao && selecoesGerentes.some((selecionado) => normalizarFuncaoComparacao(gerentesElegiveis.find((candidato) => candidato.id === selecionado)?.funcao) === funcao)); return <option key={item.id} value={item.id} disabled={usada}>{item.nome} · {item.funcao}{usada ? ' · função já escolhida' : ''}</option>})}</select></label>})}<div className="flex flex-wrap gap-2"><Button type="submit" disabled={alocandoGerente || !gerentesElegiveis.length}>{alocandoGerente ? 'Adicionando…' : 'Adicionar gerente(s)'}</Button>{gerentesElegiveis.length > selecoesGerentes.length && <Button type="button" variant="outline" onClick={() => setSelecoesGerentes((atual) => [...atual, ''])}>Adicionar outro</Button>}</div>{gerentesElegiveis.length === 0 && <p className="text-xs text-slate-500">Não há outros gerentes com conta ativa disponíveis nesta empresa.</p>}</form></section></div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Contrato</h2>{obra.contrato?.arquivoUrl ? <div className="mt-2"><a href={obra.contrato.arquivoUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-sky-700 underline">Abrir contrato PDF</a>{obra.contrato.termos && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{obra.contrato.termos}</p>}</div> : <p className="mt-2 text-sm text-slate-500">O contrato será anexado no cadastro do cliente, na tela Clientes.</p>}</section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Fotos da obra</h2>{(obra.fotos || []).length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{obra.fotos.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Foto da obra ${obra.titulo}`} loading="lazy" className="h-48 w-full rounded-lg object-cover" /></a>)}</div>}<form onSubmit={salvarFotoObra} className="mt-4 flex flex-wrap items-end gap-3"><label className="min-w-64 flex-1 text-sm">Adicionar foto (JPG, PNG ou WebP; até 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { setFotoObra(e.target.files?.[0] || null); setErroFoto(''); limparFeedback('foto') }} className="mt-1 block w-full rounded border border-slate-300 p-2" />{erroFoto && <span role="alert" className="mt-1 block text-xs font-semibold text-red-800">{erroFoto}</span>}</label><Button type="submit" disabled={salvando || !fotoObra}>{salvando ? 'Enviando…' : 'Adicionar foto'}</Button>{feedback.foto && <p role="status" className="w-full rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{feedback.foto.texto}</p>}</form></section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Registrar atualização</h2><form onSubmit={registrarNota} className="mt-4 space-y-3"><label className="block text-sm">Tipo<select value={tipoRegistro} onChange={(e) => setTipoRegistro(e.target.value)} className="mt-1 w-full rounded border border-slate-300 p-2"><option value="ATUALIZACAO">Atualização de andamento</option><option value="ANOTACAO">Anotação</option><option value="OCORRENCIA">Ocorrência</option></select></label><label className="block text-sm">Descrição<textarea required rows="3" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={2000} placeholder="Descreva a atualização da obra…" className="mt-1 w-full rounded border border-slate-300 p-3" /></label><label className="block text-sm">Foto opcional<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { setFotoRegistro(e.target.files?.[0] || null); limparFeedback('andamento') }} className="mt-1 block w-full text-sm" /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visivel} onChange={(e) => setVisivel(e.target.checked)} />Visível para o cliente</label>{feedback.andamento && <p role={feedback.andamento.tipo === 'erro' ? 'alert' : 'status'} className={`rounded-lg p-3 text-sm font-semibold ${feedback.andamento.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{feedback.andamento.texto}</p>}<Button type="submit" disabled={salvando}>Registrar atualização</Button></form></section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-navy">Histórico da obra</h2><Link to={`/admin/notificacoes?obraId=${encodeURIComponent(id)}`} className="text-sm font-semibold text-sky-700 underline">Notificações desta obra</Link></div><ol className="mt-4 space-y-3">{(obra.timeline || []).map((item) => <li key={item.id} className="border-l-2 border-sky-200 pl-3"><details><summary className="cursor-pointer text-xs font-semibold text-slate-600">{item.data} {item.hora} · {item.autor || 'Sistema'} · {item.tipo}</summary><p className="mt-2 text-sm text-slate-800">{item.descricao}</p>{item.fotoUrl && <a className="text-xs text-sky-700 underline" href={item.fotoUrl} target="_blank" rel="noreferrer">Abrir foto</a>}</details></li>)}</ol>{!obra.timeline?.length && <p className="mt-3 text-sm text-slate-500">Nenhuma atualização registrada.</p>}</section>

      <section className="rounded-xl border border-red-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-red-800">Arquivar obra</h2><p className="mt-1 text-sm text-slate-600">A obra poderá ser restaurada por sete dias. Só obras agendadas sem parcela paga e sem pagamento em processamento podem ser arquivadas.</p>{bloqueioArquivamento && <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">{bloqueioArquivamento}</p>}{erroArquivar && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{erroArquivar}</p>}<form onSubmit={arquivar} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm sm:col-span-2">Motivo (10 a 500 caracteres)<textarea required minLength={10} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-sm">Senha do administrador<input required type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} className="mt-1 w-full rounded border border-slate-300 p-2" /></label><Button variant="outline" type="submit" disabled={salvando || Boolean(bloqueioArquivamento)} className="self-end border-red-300 text-red-800">Arquivar obra</Button></form></section>
    </main></div>
}
