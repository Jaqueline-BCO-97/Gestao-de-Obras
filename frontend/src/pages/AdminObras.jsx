// Importa o hook useState do React para controlar filtros e avisos na tela
import { useCallback, useEffect, useState } from 'react'

// Importa os componentes de navegação do react-router-dom
import { useNavigate } from 'react-router-dom'

// Importa o componente reutilizável Card do sistema de design
import Card from '../components/Card.jsx'

// Importa o componente reutilizável Button do sistema de design
import Button from '../components/Button.jsx'

// Importa os dados das obras e as funções de moeda e cores
import { formatarMoeda, obterCoresStatus } from '../data/obrasMock.js'

// Importa a lista de colaboradores mockados para exibir os membros da equipe alocada
import { listarObras, listarObrasArquivadas, restaurarObra, solicitarConferenciaObra, criarObra } from '../services/auth.js'

function moedaEntrada(valor) {
  const centavos = String(valor).replace(/\D/g, '')
  if (!centavos) return ''
  return (Number(centavos) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function moedaNumero(valor) { return String(valor).replace(/\./g, '').replace(',', '.') }

// Importa a função de logout para permitir ao administrador encerrar a sessão

// Componente da página de Gestão de Obras do Administrador (/admin/obras)
export default function AdminObras() {
  // Inicializa o hook de navegação para alternar entre rotas
  const navigate = useNavigate()

  // Estado para armazenar o status selecionado no filtro (padrão 'Todos')
  const [filtroStatus, setFiltroStatus] = useState('Todos')

  // Estado para armazenar o aviso de visualização ao clicar no botão "Ver"
  const [obras, setObras] = useState([])
  const [arquivadas, setArquivadas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [erroAcao, setErroAcao] = useState({})
  const [solicitando, setSolicitando] = useState('')
  const [feedbackForm, setFeedbackForm] = useState('')
  const [feedbackFormErro, setFeedbackFormErro] = useState(false)
  const [fotosObra, setFotosObra] = useState([])
  const [novaObra, setNovaObra] = useState({ nome: '', descricao: '', clienteId: '', estado: '', cidade: '', bairro: '', endereco: '', numero: '', semApartamento: false, apartamento: '', semBloco: false, bloco: '', prazoFinal: '', quantidadeParcelas: '', vencimentoInicial: '', valorTotal: '', informacoesAdicionais: '' })

  const atualizarObras = useCallback(async () => { const [ativas, arquivadasApi] = await Promise.all([listarObras(), listarObrasArquivadas()]); setObras(ativas); setArquivadas(arquivadasApi) }, [])

  useEffect(() => {
    let ativo = true
    Promise.all([listarObras(), listarObrasArquivadas()]).then(([resultado, arquivadasApi]) => { if (ativo) { setObras(resultado); setArquivadas(arquivadasApi); setErro('') } })
      .catch((falha) => { if (ativo) setErro(falha.message) })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [])

  // Lista fixa de opções de filtro permitidas pelo escopo
  const opcoesFiltro = [
    // Opção para exibir todas as obras cadastradas sem filtro
    'Todos',
    // Filtro para obras com status Agendada
    'Agendada',
    // Filtro para obras com status Em andamento
    'Em andamento',
    // Filtro para obras com status Aguardando conferência
    'Aguardando conferência',
    // Filtro para obras com status Concluída
    'Concluída',
  ]

  // Filtra as obras conforme a opção selecionada no filtro
  const obrasFiltradas = filtroStatus === 'Todos'
    // Se 'Todos' estiver selecionado, exibe todas as obras
    ? obras
    // Caso contrário, filtra pelo status exato selecionado
    : obras.filter((obra) => obra.status === filtroStatus)

  // Função auxiliar para buscar os colaboradores completos que estão escalados na obra
  function obterColaboradores(obra) {
    // Usa os nomes e funções reais retornados para o administrador.
    return (obra.colaboradores || []).map((colaborador) => typeof colaborador === 'object'
      ? colaborador
      : ({ id: colaborador, nome: colaborador, funcao: 'Alocado', telefone: '' }))
  }

  async function handleSolicitarConferencia(obra) {
    setSolicitando(obra.id)
    setErroAcao((atuais) => ({ ...atuais, [obra.id]: '' }))
    try {
      await solicitarConferenciaObra(obra.id)
      await atualizarObras()
    } catch (falha) {
      setErroAcao((atuais) => ({ ...atuais, [obra.id]: falha.message }))
    } finally {
      setSolicitando('')
    }
  }

  async function handleRestaurar(obra) {
    if (!obra.restauravel) return
    setErroAcao((atuais) => ({ ...atuais, [obra.id]: '' }))
    try { await restaurarObra(obra.id); await atualizarObras() }
    catch (falha) { setErroAcao((atuais) => ({ ...atuais, [obra.id]: falha.message })) }
  }

  async function handleCriarObra(event) {
    event.preventDefault(); setFeedbackForm(''); setFeedbackFormErro(false)
    const erros = []
    if (!novaObra.quantidadeParcelas) erros.push('Selecione a quantidade de parcelas.')
    if (!/^\d+$/.test(novaObra.numero)) erros.push('Número do endereço: use apenas números.')
    if (!novaObra.semApartamento && !/^\d+$/.test(novaObra.apartamento)) erros.push('Apartamento: use apenas números.')
    if (!novaObra.semBloco && !/^[a-z\d]+$/i.test(novaObra.bloco)) erros.push('Bloco: use apenas letras e números.')
    const valorNormalizado = moedaNumero(novaObra.valorTotal)
    if (!/^\d+(?:\.\d{1,2})?$/.test(valorNormalizado) || Number(valorNormalizado) <= 0) erros.push('Valor final: informe um valor maior que zero, com até duas casas decimais.')
    if (erros.length) { setFeedbackForm(erros.join(' ')); setFeedbackFormErro(true); return }
    try {
      const fotos = await Promise.all(fotosObra.map((arquivo) => new Promise((resolve, reject) => {
        const leitor = new FileReader(); leitor.onload = () => resolve({ data: leitor.result, mimeType: arquivo.type }); leitor.onerror = () => reject(new Error('Não foi possível ler uma das fotos.')); leitor.readAsDataURL(arquivo)
      })))
      const resposta = await criarObra({ ...novaObra, quantidadeParcelas: Number(novaObra.quantidadeParcelas), valorTotal: valorNormalizado, fotos })
      setNovaObra({ nome: '', descricao: '', clienteId: '', estado: '', cidade: '', bairro: '', endereco: '', numero: '', semApartamento: false, apartamento: '', semBloco: false, bloco: '', prazoFinal: '', quantidadeParcelas: '', vencimentoInicial: '', valorTotal: '', informacoesAdicionais: '' }); setFotosObra([])
      setFeedbackForm(resposta.avisos?.length ? `Obra criada, mas as fotos não foram enviadas: ${resposta.avisos.join('; ')}` : 'Obra cadastrada. Cadastre o cliente na tela Clientes para anexar contrato e parcelas.')
      await atualizarObras()
    } catch (falha) { setFeedbackForm(falha.message); setFeedbackFormErro(true) }
  }

  // Abre a página de gestão com dados, equipe e histórico da obra.
  function handleVerObra(obra) {
    navigate(`/admin/obra/${encodeURIComponent(obra.id)}`)
  }

  const hoje = new Date()
  const valorBaseNumero = Number(moedaNumero(novaObra.valorTotal || '0')) || 0
  const quantidadeEscolhida = novaObra.quantidadeParcelas ? Number(novaObra.quantidadeParcelas) : null
  const valorFinalEstimado = quantidadeEscolhida === null ? null : valorBaseNumero * (1 + (quantidadeEscolhida > 12 ? 0.01 * (quantidadeEscolhida - 12) : 0))
  const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  const proximasObras = obras.filter((obra) => obra.status === 'Agendada' && obra.agendadaParaISO && obra.agendadaParaISO > hojeISO).sort((a, b) => a.agendadaParaISO.localeCompare(b.agendadaParaISO))

  // Renderiza a interface da página de Gestão de Obras
  return (
    // Contêiner de tela cheia com fundo claro padrão e tipografia padrão
    <div className="min-h-screen bg-background text-ink">




      {/* Conteúdo principal */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Linha superior com botão de voltar para /admin e título */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Informações do cabeçalho */}
          <div>
            {/* Botão de retorno direto para o painel principal do administrador */}
            <Button
              variant="outline"
              onClick={() => navigate('/admin')}
              className="mb-3 text-xs py-1.5 px-3"
              icon="←"
            >
              Voltar ao Dashboard
            </Button>
            {/* Título da tela */}
            <h1 className="text-2xl sm:text-3xl font-bold text-navy">
              Gestão de Obras
            </h1>
            {/* Descrição objetiva da funcionalidade desta página */}
            <p className="mt-1 text-sm text-slate-500">
              Consulte a listagem completa de obras, filtre por status operacional e visualize alocação de equipe.
            </p>
          </div>

          {/* Contador de obras filtradas vs total geral */}
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-right self-start sm:self-auto">
            {/* Rótulo do contador */}
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Exibindo</span>
            {/* Número com destaque */}
            <strong className="text-lg font-bold text-navy">
              {obrasFiltradas.length} de {obras.length} obras
            </strong>
          </div>
        </div>

        {carregando && <p className="mb-4 text-sm text-slate-500" role="status">Carregando obras…</p>}
        {/* Barra de filtros por status (mobile-first com rolagem ou quebra de linha suave) */}
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          {/* Rótulo da seção de filtro */}
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Filtrar por Status:
          </p>
          {/* Botões seletores de cada status */}
          <div className="flex flex-wrap gap-2">
            {/* Mapeia a lista de opções de status disponíveis */}
            {opcoesFiltro.map((opcao) => {
              // Verifica se a opção atual é a que está selecionada
              const selecionado = filtroStatus === opcao
              // Conta quantas obras têm esse status (ou o total para 'Todos')
              const contagem = opcao === 'Todos'
                ? obras.length
                : obras.filter((o) => o.status === opcao).length

              // Retorna o botão de filtro
              return (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => setFiltroStatus(opcao)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                    selecionado
                      ? 'bg-navy text-white border-navy shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {/* Nome da opção de filtro */}
                  <span>{opcao}</span>
                  {/* Badge numérico com contagem de obras */}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      selecionado ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {contagem}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {proximasObras.length > 0 && <section className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4"><h2 className="font-bold text-navy">Obras nos próximos dias</h2><ul className="mt-2 grid gap-2 sm:grid-cols-2">{proximasObras.map((obra) => <li key={obra.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"><span className="font-semibold text-navy">{obra.titulo}</span><span className="text-xs text-slate-600">{new Date(`${obra.agendadaParaISO}T12:00:00`).toLocaleDateString('pt-BR')}</span><Button variant="outline" onClick={() => handleVerObra(obra)} className="px-2 py-1 text-xs">Abrir</Button></li>)}</ul></section>}

        {/* Bloco da tabela: com overflow-x-auto restrito ao próprio bloco para rolagem em celulares */}
        <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {erro && <p className="m-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">{erro} <button type="button" className="underline" onClick={() => atualizarObras().then(() => setErro('')).catch((falha) => setErro(falha.message))}>Tentar novamente</button></p>}

          {/* Contêiner de rolagem horizontal isolado para telas pequenas (mobile-first) */}
          <div className="overflow-x-auto w-full">

            {/* Tabela de dados com largura mínima para garantir legibilidade nas colunas */}
            <table className="w-full min-w-[760px] text-left text-sm text-slate-600 border-collapse">

              {/* Cabeçalho da tabela com fundo suave */}
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  {/* Coluna 1: Título e endereço da obra */}
                  <th scope="col" className="py-3.5 px-4 sm:px-6">Obra</th>
                  {/* Coluna 2: Nome do cliente */}
                  <th scope="col" className="py-3.5 px-4">Cliente</th>
                  {/* Coluna 3: Status atual colorido */}
                  <th scope="col" className="py-3.5 px-4">Status</th>
                  {/* Coluna 4: Valor total do contrato */}
                  <th scope="col" className="py-3.5 px-4">Valor Total</th>
                  {/* Coluna 5: Colaboradores alocados */}
                  <th scope="col" className="py-3.5 px-4">Colaboradores</th>
                  {/* Coluna 6: Ações disponíveis */}
                  <th scope="col" className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>

              {/* Corpo da tabela com listagem de obras */}
              <tbody className="divide-y divide-slate-100">
                {/* Se houver obras correspondentes ao filtro */}
                {obrasFiltradas.length > 0 ? (
                  // Percorre cada obra filtrada
                  obrasFiltradas.map((obra) => {
                    // Obtém as cores do status da obra atual
                    const cores = obterCoresStatus(obra.status)
                    // Obtém os dados completos dos colaboradores alocados
                    const colaboradoresAlocados = obterColaboradores(obra)

                    // Retorna a linha da tabela
                    return (
                      <tr key={obra.id} className="hover:bg-slate-50/80 transition-colors">

                        {/* Célula: Título e endereço da obra */}
                        <td className="py-3.5 px-4 sm:px-6">
                          {/* Nome da obra em destaque */}
                          <p className="font-bold text-navy">{obra.titulo}</p>
                          {/* Endereço resumido em tamanho menor */}
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{obra.endereco}</p>
                        </td>

                        {/* Célula: Cliente */}
                        <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                          {obra.cliente || 'Não informado'}
                        </td>

                        {/* Célula: Status com badge colorido */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {/* Badge colorido usando a função obterCoresStatus */}
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cores.badge}`}
                          >
                            {/* Ponto indicador de status */}
                            <span className={`w-2 h-2 rounded-full ${cores.ponto}`}></span>
                            {/* Texto do status */}
                            {obra.status}
                          </span>
                        </td>

                        {/* Célula: Valor formatado em reais */}
                        <td className="py-3.5 px-4 font-bold text-navy whitespace-nowrap">
                          {formatarMoeda(obra.valorTotal)}
                        </td>

                        {/* Célula: Colaboradores alocados com suas funções */}
                        <td className="py-3.5 px-4">
                          {/* Contêiner de tags dos colaboradores */}
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {/* Se houver colaboradores alocados */}
                            {colaboradoresAlocados.length > 0 ? (
                              colaboradoresAlocados.map((colaborador) => (
                                // Tag com o nome e a função do colaborador
                                <span
                                  key={colaborador.id}
                                  className="inline-block bg-slate-100 text-slate-700 text-[11px] px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap"
                                  title={`${colaborador.nome} (${colaborador.funcao}) - Tel: ${colaborador.telefone}`}
                                >
                                  {colaborador.nome} <span className="text-slate-400">({colaborador.funcao})</span>
                                </span>
                              ))
                            ) : (
                              // Aviso quando não houver colaboradores atribuídos
                              <span className="text-xs text-slate-400 italic">Nenhum</span>
                            )}
                          </div>
                        </td>

                        {/* Célula: Botão de ação "Ver" */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-2">
                            <Button variant="compact" onClick={() => handleVerObra(obra)} className="w-44 text-xs py-1 px-3">Gerenciar</Button>
                            {obra.status === 'Em andamento' && <Button variant="compact" disabled={Boolean(solicitando)} onClick={() => handleSolicitarConferencia(obra)} className="w-44 text-xs py-1 px-3">{solicitando === obra.id ? 'Enviando…' : 'Solicitar conferência'}</Button>}
                            {erroAcao[obra.id] && <p role="alert" className="max-w-44 whitespace-normal rounded bg-red-50 p-2 text-left text-xs font-semibold text-red-800">{erroAcao[obra.id]}</p>}
                          </div>
                        </td>

                      </tr>
                    )
                  })
                ) : (
                  // Caso não existam obras para o filtro escolhido
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      Nenhuma obra encontrada para o status selecionado.
                    </td>
                  </tr>
                )}
              </tbody>

            </table>

          </div>

          {/* Rodapé da tabela com sumário */}
          <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Dica: Clique no botão "Ver" para inspecionar os dados da obra selecionada.</span>
            <span className="font-semibold text-slate-700">Total listado: {obrasFiltradas.length} obra(s)</span>
          </div>

        </div>

        {arquivadas.length > 0 && <section className="mt-8 rounded-xl border border-amber-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-navy">Obras arquivadas</h2><p className="mt-1 text-xs text-slate-600">Cada obra fica recuperável até a data indicada. O registro é mantido no banco.</p><div className="mt-3 space-y-2">{arquivadas.map((obra) => <article key={obra.id} className="rounded-lg bg-amber-50 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><strong className="text-navy">{obra.titulo}</strong><p className="text-xs text-slate-600">Motivo: {obra.exclusaoMotivo} · {obra.restauravel ? `Restaurar até ${new Date(obra.exclusaoExpiraEm).toLocaleString('pt-BR')}` : 'Prazo de restauração expirado'}</p></div><Button variant="outline" disabled={!obra.restauravel} onClick={() => handleRestaurar(obra)} className="text-xs">Restaurar obra</Button></div>{erroAcao[obra.id] && <p role="alert" className="mt-2 rounded bg-red-50 p-2 text-sm font-semibold text-red-800">{erroAcao[obra.id]}</p>}</article>)}</div></section>}

        {/* Cartão de resumo rápido reutilizando Card.jsx */}
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-navy">Cadastrar obra</h2>
          <p className="mt-1 text-sm text-slate-600">Cadastre os dados da obra, o valor base e o plano de parcelas. O primeiro vencimento define as datas mensais seguintes.</p>
          <form onSubmit={handleCriarObra} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">Nome da obra<input required value={novaObra.nome} onChange={(e) => setNovaObra({ ...novaObra, nome: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
            <label className="text-sm">Descrição da obra<input required value={novaObra.descricao} onChange={(e) => setNovaObra({ ...novaObra, descricao: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
            <label className="text-sm">Estado<input required value={novaObra.estado} onChange={(e) => setNovaObra({ ...novaObra, estado: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
            <label className="text-sm">Cidade<input required value={novaObra.cidade} onChange={(e) => setNovaObra({ ...novaObra, cidade: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
            <label className="text-sm">Bairro<input required value={novaObra.bairro} onChange={(e) => setNovaObra({ ...novaObra, bairro: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
            <label className="text-sm">Endereço (rua/avenida)<input required value={novaObra.endereco} onChange={(e) => setNovaObra({ ...novaObra, endereco: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
            <label className="text-sm">Número<input required inputMode="numeric" pattern="[0-9]+" title="Use apenas números" value={novaObra.numero} onChange={(e) => setNovaObra({ ...novaObra, numero: e.target.value.replace(/\D/g, '') })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
            <div className="grid gap-2 sm:grid-cols-2"><label className="text-sm">Apartamento<input disabled={novaObra.semApartamento} required={!novaObra.semApartamento} inputMode="numeric" pattern="[0-9]+" title="Use apenas números" value={novaObra.apartamento} onChange={(e) => setNovaObra({ ...novaObra, apartamento: e.target.value.replace(/\D/g, '') })} className="mt-1 w-full rounded border border-slate-300 p-2 disabled:bg-slate-100" /></label><label className="mt-6 flex items-center gap-2 text-xs"><input type="checkbox" checked={novaObra.semApartamento} onChange={(e) => setNovaObra({ ...novaObra, semApartamento: e.target.checked, apartamento: '' })} /> Não existe apartamento</label></div>
            <div className="grid gap-2 sm:grid-cols-2"><label className="text-sm">Bloco<input disabled={novaObra.semBloco} required={!novaObra.semBloco} pattern="[A-Za-z0-9]+" title="Use apenas letras e números" value={novaObra.bloco} onChange={(e) => setNovaObra({ ...novaObra, bloco: e.target.value.replace(/[^a-z\d]/gi, '') })} className="mt-1 w-full rounded border border-slate-300 p-2 disabled:bg-slate-100" /></label><label className="mt-6 flex items-center gap-2 text-xs"><input type="checkbox" checked={novaObra.semBloco} onChange={(e) => setNovaObra({ ...novaObra, semBloco: e.target.checked, bloco: '' })} /> Não existe bloco</label></div>
            <label className="text-sm">Prazo final<input required type="date" value={novaObra.prazoFinal} onChange={(e) => setNovaObra({ ...novaObra, prazoFinal: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
            <label className="text-sm">Valor base (R$)<input required inputMode="decimal" placeholder="40.000,25" value={novaObra.valorTotal} onChange={(e) => setNovaObra({ ...novaObra, valorTotal: moedaEntrada(e.target.value) })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
            <label className="text-sm">Quantidade de parcelas<select required value={novaObra.quantidadeParcelas} onChange={(e) => setNovaObra({ ...novaObra, quantidadeParcelas: e.target.value })} className="mt-1 max-h-28 w-full overflow-y-auto rounded border border-slate-300 p-2"><option value="">Selecione…</option>{Array.from({ length: 36 }, (_, index) => index + 1).map((quantidade) => <option key={quantidade} value={quantidade}>{quantidade} parcela{quantidade === 1 ? '' : 's'}{quantidade <= 12 ? ' · sem juros' : ' · juros de 1% por parcela adicional'}</option>)}</select></label>
            <label className="text-sm">Vencimento da primeira parcela<input required type="date" value={novaObra.vencimentoInicial} onChange={(e) => setNovaObra({ ...novaObra, vencimentoInicial: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
            <p className="text-sm text-slate-600">Valor final estimado: <strong>{valorFinalEstimado === null ? '—' : formatarMoeda(valorFinalEstimado)}</strong>. Até 12 parcelas sem juros; acima disso, acréscimo simples de 1% por parcela adicional.</p>
            <label className="text-sm sm:col-span-2 lg:col-span-3">Informações de execução: serviços, materiais e medidas previstos no contrato<textarea required rows="4" value={novaObra.informacoesAdicionais} onChange={(e) => setNovaObra({ ...novaObra, informacoesAdicionais: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
            <label className="text-sm sm:col-span-2 lg:col-span-3">Fotos iniciais (JPG, PNG ou WebP; até 5 arquivos de 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { const arquivos = Array.from(e.target.files || []); if (arquivos.length > 5 || arquivos.some((arquivo) => !['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type) || arquivo.size > 5 * 1024 * 1024)) { setFotosObra([]); e.target.value = ''; setFeedbackForm('Cada foto deve ser JPG, PNG ou WebP de até 5 MB (máximo de 5 fotos).'); setFeedbackFormErro(true); return } setFotosObra(arquivos); setFeedbackForm(''); setFeedbackFormErro(false) }} className="mt-1 block w-full rounded border border-slate-300 p-2" /></label>
            {feedbackForm && <p role={feedbackFormErro ? 'alert' : 'status'} className={`rounded-lg p-3 text-sm font-semibold sm:col-span-2 lg:col-span-3 ${feedbackFormErro ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{feedbackForm}</p>}<Button type="submit" className="sm:col-span-2 lg:col-span-3">Criar obra</Button>
          </form>
        </section>

        {/* Cartão de resumo rápido reutilizando Card.jsx */}
        <div className="mt-8">
          <Card
            label="Informações de Gestão"
            accent="border-navy"
            className="text-xs text-slate-600"
          >
            <p className="mt-2 leading-relaxed">
              Esta visualização lista todas as obras em andamento, agendadas, aguardando conferência e concluídas no sistema.
              Para retornar ao painel central com métricas gerais e faturamento a receber, utilize o botão de navegação acima.
            </p>
          </Card>
        </div>

      </main>
    </div>
  )
}
