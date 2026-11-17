// Importa os hooks useParams, useNavigate e Link do react-router-dom para lidar com parâmetros de rota e navegação
import { useParams, useNavigate, Link } from 'react-router-dom'
// Importa hooks para carregar os dados da obra e atualizar a tela.
import { useEffect, useState } from 'react'

// Importa o componente reutilizável Card do sistema de design
import Card from '../components/Card.jsx'

// Importa o componente reutilizável Button do sistema de design
import Button from '../components/Button.jsx'

// Importa o componente compartilhado que apresenta os eventos da obra
import HistoricoObra from '../components/HistoricoObra.jsx'

// Importa utilitários visuais mantidos em comum com as telas existentes.
import { formatarMoeda, obterCoresStatus } from '../data/obrasMock.js'
import { buscarObra, confirmarConclusaoObra } from '../services/auth.js'
import { consultaAindaPertenceAObra, criarRastreadorObra, detectarNovosAgendamentos, registrarEventosConhecidos, registrarListenerOnline } from '../utils/eventosAgendamento.js'
import { textoDataParcela } from '../utils/formatacaoParcela.js'

// Componente da página de Detalhes da Obra do Cliente (/cliente/obra/:id)
export default function ClienteObra() {
  // Extrai o parâmetro dinâmico ":id" presente na URL do navegador
  const { id } = useParams()
  return <ClienteObraConteudo key={id} id={id} />
}

function ClienteObraConteudo({ id }) {
  // Inicializa o hook de navegação para permitir retornar ao painel via código
  const navigate = useNavigate()
  const [obra, setObra] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [avisoAgendamento, setAvisoAgendamento] = useState(null)
  const [confirmandoConclusao, setConfirmandoConclusao] = useState(false)
  const [erroConclusao, setErroConclusao] = useState('')
  const [sucessoConclusao, setSucessoConclusao] = useState('')
  useEffect(() => {
    // A chave por obra cria estado novo; o cleanup invalida respostas da montagem anterior.
    const rastreador = criarRastreadorObra(id)
    let ativo = true
    let consultaEmAndamento = false
    let intervalo

    async function atualizarObra() {
      if (!ativo || document.visibilityState === 'hidden' || consultaEmAndamento) return
      consultaEmAndamento = true
      try {
        const atualizada = await buscarObra(id)
        if (!consultaAindaPertenceAObra(rastreador, id, ativo)) return
        const eventos = atualizada.timeline || []
        if (rastreador.primeiraLeitura) {
          // A leitura inicial estabelece a base; histórico antigo não dispara aviso.
          registrarEventosConhecidos(eventos, rastreador.idsConhecidos)
          rastreador.primeiraLeitura = false
        } else {
          const novos = detectarNovosAgendamentos(eventos, rastreador.idsConhecidos)
          if (novos.length) setAvisoAgendamento(novos[novos.length - 1])
        }
        setObra({
          ...atualizada,
          parcela1: atualizada.parcela1 || { valor: 0, situacao: 'pendente' },
          parcela2: atualizada.parcela2 || { valor: 0, situacao: 'pendente' },
        })
        setErro('')
      } catch (falha) {
        if (consultaAindaPertenceAObra(rastreador, id, ativo)) setErro(falha.message)
      } finally {
        consultaEmAndamento = false
        if (consultaAindaPertenceAObra(rastreador, id, ativo)) setCarregando(false)
      }
    }

    function aoRetomarAba() {
      if (document.visibilityState === 'visible') atualizarObra()
    }

    atualizarObra()
    intervalo = window.setInterval(atualizarObra, 30000)
    document.addEventListener('visibilitychange', aoRetomarAba)
    const removerListenerOnline = registrarListenerOnline(atualizarObra)
    return () => {
      ativo = false
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', aoRetomarAba)
      removerListenerOnline()
    }
  }, [id])

  if (carregando) {
    return <main className="min-h-screen bg-background p-8 text-center text-sm text-slate-600" role="status">Carregando dados da obra…</main>
  }

  // Caso nenhuma obra seja encontrada com o ID informado na URL, exibe uma tela amigável de erro 404
  if (!obra) {
    // Retorna a interface avisando que a obra não foi localizada
    return (
      // Contêiner centralizado ocupando a tela inteira com fundo claro
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 text-ink">
        {/* Cartão de aviso de erro com borda e sombra */}
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          {/* Ícone de alerta em círculo vermelho suave */}
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-600 text-2xl" aria-hidden="true">
            ⚠
          </div>
          {/* Título informando que a obra não foi encontrada */}
          <h1 className="text-xl sm:text-2xl font-bold text-navy mb-2">
            Obra não encontrada
          </h1>
          {/* Mensagem explicativa mostrando o ID que foi buscado sem sucesso */}
          <p className="text-sm text-slate-500 mb-6">
            {erro || <>Não foi possível localizar nenhuma obra cadastrada com o identificador <code className="font-mono font-bold text-primary bg-slate-100 px-1.5 py-0.5 rounded">#{id}</code>.</>}
          </p>
          {/* Botão para retornar ao painel do cliente usando o componente Button */}
          <Button
            variant="primary"
            onClick={() => navigate('/cliente')}
            className="w-full"
            icon="←"
          >
            Voltar para: Minhas Obras
          </Button>
        </div>
      </div>
    )
  }

  // Obtém o conjunto de cores personalizadas conforme o status da obra encontrada
  const cores = obterCoresStatus(obra.status)

  async function handleConfirmarConclusao() {
    if (!window.confirm('Confirma que a obra foi concluída? Esta ação libera a segunda parcela.')) return
    setConfirmandoConclusao(true)
    setErroConclusao('')
    setSucessoConclusao('')
    try {
      await confirmarConclusaoObra(id)
      const atualizada = await buscarObra(id)
      setObra({ ...atualizada, parcela1: atualizada.parcela1 || { valor: 0, situacao: 'pendente' }, parcela2: atualizada.parcela2 || { valor: 0, situacao: 'pendente' } })
      setSucessoConclusao('Conclusão confirmada. A segunda parcela está disponível para pagamento.')
    } catch (falha) {
      setErroConclusao(falha.message)
    } finally {
      setConfirmandoConclusao(false)
    }
  }
  // Retorna a interface completa de detalhes da obra
  return (
    // Contêiner principal com fundo suave padrão e altura mínima de 100vh
    <div className="min-h-screen bg-background text-ink">

      {/* Cabeçalho fixo no topo com navegação e botão para voltar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        {/* Contêiner interno limitado e com alinhamento entre os lados */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Botão de retorno rápido para a listagem de obras */}
          <Button
            variant="outline"
            onClick={() => navigate('/cliente')}
            className="text-xs py-1.5 px-3"
            icon="←"
          >
            Voltar para: Minhas Obras
          </Button>

          {/* Trilha de navegação (breadcrumb) informando a posição atual */}
          <nav className="text-xs text-slate-500 hidden sm:flex items-center gap-2" aria-label="Navegação estrutural">
            {/* Link de volta para a lista */}
            <Link to="/cliente" className="hover:text-primary transition">
              Minhas Obras
            </Link>
            {/* Separador */}
            <span>/</span>
            {/* Nome da obra atual */}
            <span className="font-semibold text-navy truncate max-w-[200px]">
              {obra.titulo}
            </span>
          </nav>
        </div>
      </header>

      {/* Conteúdo principal com espaçamento responsivo (mobile-first) */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {erro && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="status">Não foi possível atualizar agora. Tentaremos novamente automaticamente. {erro}</p>}
        {avisoAgendamento && (
          <aside className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950" role="status" aria-live="polite">
            <div className="flex items-start justify-between gap-3">
              <div><strong className="block">A obra foi reagendada</strong><span>{avisoAgendamento.descricao}</span></div>
              <button type="button" onClick={() => setAvisoAgendamento(null)} className="shrink-0 font-semibold" aria-label="Fechar aviso">Fechar</button>
            </div>
          </aside>
        )}

        {/* Bloco 1: Informações principais da Obra (Título, Status, Endereço e Prazo) */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-sm">
          {/* Linha superior com etiqueta da obra e status colorido */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            {/* Etiqueta com o identificador numérico da obra */}
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Obra #{obra.id}
            </span>

            {/* Badge com cor e indicador específicos do status da obra */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cores.badge}`}
            >
              {/* Círculo com cor viva indicando o status */}
              <span className={`w-2 h-2 rounded-full ${cores.ponto}`}></span>
              {/* Nome do status da obra */}
              {obra.status}
            </span>
          </div>

          {/* Título de nível 1 com o nome da obra */}
          <h1 className="text-2xl sm:text-3xl font-bold text-navy mb-4 leading-tight">
            {obra.titulo}
          </h1>

          {/* Informações detalhadas da localização e do prazo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600">
            {/* Item do endereço da obra */}
            <div className="flex items-start gap-2.5">
              {/* Ícone de localização (marcador de mapa) */}
              <svg className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {/* Endereço completo */}
              <div>
                <strong className="block text-navy font-semibold">Endereço da Obra:</strong>
                <span>{obra.endereco}</span>
              </div>
            </div>

            {/* Item do prazo de conclusão */}
            <div className="flex items-start gap-2.5">
              {/* Ícone de calendário */}
              <svg className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {/* Data limite estimada */}
              <div>
                <strong className="block text-navy font-semibold">Previsão de Conclusão:</strong>
                <span>{obra.prazo}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Bloco 2: Valores Financeiros da Obra (Valor Total e as 2 Parcelas de 50%) */}
        <section aria-label="Informações financeiras e parcelas">
          {/* Título da seção financeira */}
          <div className="mb-3">
            <h2 className="text-lg font-bold text-navy">
              Informações Financeiras
            </h2>
            <p className="text-xs text-slate-500">
              Detalhamento do investimento total e a situação de cada parcela (50% cada).
            </p>
          </div>

          {/* Grade com 3 cartões financeiros reutilizando o componente Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Cartão 1: Valor Total Contratado */}
            <Card
              label="Valor Total da Obra"
              value={formatarMoeda(obra.valorTotal)}
              accent="border-navy"
              icon={
                // Ícone SVG de cifrão / dinheiro
                <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            >
              {/* Informação adicional de rodapé do card */}
              <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
                Contrato fechado com divisão em 2 etapas
              </p>
            </Card>

            {/* Cartão 2: 1ª Parcela (50%) */}
            <Card
              label="1ª Parcela (50% - Entrada)"
              value={formatarMoeda(obra.parcela1.valor)}
              accent={obra.parcela1.situacao === 'paga' ? 'border-emerald-500' : 'border-amber-500'}
              icon={
                // Ícone representando fatura / parcela
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            >
              {/* Status e data da primeira parcela */}
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                <span className="text-slate-500">Situação:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold capitalize text-[11px] ${
                    obra.parcela1.situacao === 'paga'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {obra.parcela1.situacao === 'paga' ? '✓ Paga' : '⏳ Pendente'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {textoDataParcela(obra.parcela1)}
              </p>
            </Card>

            {/* Cartão 3: 2ª Parcela (50%) */}
            <Card
              label="2ª Parcela (50% - Final)"
              value={formatarMoeda(obra.parcela2.valor)}
              accent={obra.parcela2.situacao === 'paga' ? 'border-emerald-500' : 'border-amber-500'}
              icon={
                // Ícone representando conclusão de pagamento
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            >
              {/* Status e data da segunda parcela */}
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                <span className="text-slate-500">Situação:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold capitalize text-[11px] ${
                    obra.parcela2.situacao === 'paga'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {obra.parcela2.situacao === 'paga' ? '✓ Paga' : '⏳ Pendente'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {textoDataParcela(obra.parcela2)}
              </p>
            </Card>

          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-navy">Pagamentos</h2>
              <p className="text-sm text-slate-600">
                {obra.status === 'Concluída' ? 'A conclusão foi confirmada; as parcelas pendentes estão disponíveis para pagamento.' : 'A segunda parcela ficará disponível após a confirmação da conclusão da obra.'}
              </p>
            </div>
            <Button variant="primary" onClick={() => navigate(`/cliente/obra/${obra.id}/pagamento`)}>Ver parcelas e pagar</Button>
          </div>
        </section>

        {/* A API ainda não fornece fotos; a tela não simula registros visuais. */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-sm" aria-label="Galeria de fotos">
          <h2 className="mb-5 text-lg font-bold text-navy">Fotos da Obra</h2>
          <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500" role="status">
            A API ainda não disponibiliza registros fotográficos para esta obra.
          </p>
        </section>

        {/* Bloco 4: Histórico de eventos visíveis para o cliente */}
        <HistoricoObra eventos={obra.timeline} perfil="CLIENTE" />

        {erroConclusao && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{erroConclusao}</p>}
        {sucessoConclusao && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{sucessoConclusao}</p>}
        {obra.status === 'Aguardando conferência' && (
          <div className="space-y-2">
            <Button variant="primary" disabled={confirmandoConclusao} onClick={handleConfirmarConclusao}>{confirmandoConclusao ? 'Confirmando…' : 'Confirmar conclusão da obra'}</Button>
            <p className="text-xs text-slate-500">A confirmação libera a segunda parcela após o registro seguro no sistema.</p>
          </div>
        )}

        {/* Bloco 5: Botão de ação inferior para voltar ao dashboard */}
        <div className="pt-2 pb-6 flex justify-center sm:justify-start">
          <Button
            variant="outline"
            onClick={() => navigate('/cliente')}
            icon="←"
          >
            Voltar para a Lista de Obras
          </Button>
        </div>

      </main>
    </div>
  )
}
