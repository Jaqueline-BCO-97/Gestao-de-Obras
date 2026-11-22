// Importa o hook useNavigate do react-router-dom para navegação interna
import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

// Importa o componente reutilizável Card do sistema de design
import Card from '../components/Card.jsx'

// Importa o componente reutilizável Button do sistema de design
import Button from '../components/Button.jsx'

// Importa a lista de dados mockados e as funções auxiliares de formatação e cores
import { formatarMoeda, obterCoresStatus } from '../data/obrasMock.js'

import { listarObras } from '../services/auth.js'
import { detectarNovosAgendamentos, registrarEventosConhecidos, registrarListenerOnline } from '../utils/eventosAgendamento.js'

// Componente principal da página do Painel do Cliente (/cliente)
export default function Cliente() {
  // Inicializa o hook de navegação do React Router para trocar de rota via código
  const navigate = useNavigate()

  const [obras, setObras] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [avisoAgendamento, setAvisoAgendamento] = useState(null)
  const idsEventosConhecidos = useRef(new Set())

  useEffect(() => {
    let ativo = true
    let consultaEmAndamento = false
    let primeiraLeitura = true

    async function atualizarObras() {
      if (!ativo || document.visibilityState === 'hidden' || consultaEmAndamento) return
      consultaEmAndamento = true
      try {
        const resultado = await listarObras()
        if (!ativo) return
        const eventos = resultado.flatMap((obra) => obra.timeline || [])
        if (primeiraLeitura) {
          registrarEventosConhecidos(eventos, idsEventosConhecidos.current)
          primeiraLeitura = false
        } else {
          const novos = detectarNovosAgendamentos(eventos, idsEventosConhecidos.current)
          if (novos.length) setAvisoAgendamento(novos[novos.length - 1])
        }
        setObras(resultado)
        setErro('')
      } catch (falha) {
        if (ativo) setErro(falha.message)
      } finally {
        consultaEmAndamento = false
        if (ativo) setCarregando(false)
      }
    }

    function aoRetomarAba() {
      if (document.visibilityState === 'visible') atualizarObras()
    }

    atualizarObras()
    const intervalo = window.setInterval(atualizarObras, 30000)
    document.addEventListener('visibilitychange', aoRetomarAba)
    const removerListenerOnline = registrarListenerOnline(atualizarObras)
    return () => {
      ativo = false
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', aoRetomarAba)
      removerListenerOnline()
    }
  }, [])

  const totalObras = obras.length


  // Função responsável por navegar para os detalhes da obra ao clicar em um card
  function irParaDetalhes(id) {
    // Redireciona o navegador para a rota de detalhes da obra com o id correspondente
    navigate(`/cliente/obra/${id}`)
  }

  // Retorna a estrutura visual completa da página do cliente
  return (
    // Contêiner principal com cor de fundo padrão e altura mínima cobrindo toda a tela
    <div className="min-h-screen bg-background text-ink">




      {/* Conteúdo principal da página */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Cabeçalho da seção com título e mensagem explicativa */}
        <div className="mb-6 sm:mb-8">
          {/* Tag indicativa da seção atual */}
          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
            Minha Área
          </p>
          {/* Título de nível 1 em destaque */}
          <h1 className="text-2xl sm:text-3xl font-bold text-navy">
            Minhas Obras
          </h1>
          {/* Parágrafo com descrição clara do que o cliente encontra nesta tela */}
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe o status, medições, pagamentos e evolução das suas obras em tempo real.
          </p>
        </div>

        {/* Título da seção de listagem de obras */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-navy">
            Minhas obras ({totalObras})
          </h2>
          <span className="text-xs text-slate-500">
            Clique em qualquer obra para ver os detalhes completos
          </span>
        </div>

        {carregando && <p className="mb-4 text-sm text-slate-500" role="status">Carregando suas obras…</p>}
        {avisoAgendamento && (
          <aside className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950" role="status" aria-live="polite">
            <div className="flex items-start justify-between gap-3">
              <div><strong className="block">Uma obra foi reagendada</strong><span>{avisoAgendamento.descricao}</span></div>
              <button type="button" onClick={() => setAvisoAgendamento(null)} className="shrink-0 font-semibold" aria-label="Fechar aviso">Fechar</button>
            </div>
          </aside>
        )}

        {/* Grade responsiva de cartões de obras (mobile-first: 1 coluna no mobile, 2 em tablets e desktops) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6" aria-label="Lista de obras">
          {erro && <p className="md:col-span-2 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">{erro}</p>}
          {/* Itera sobre o array de obras fake para gerar cada card */}
          {obras.map((obra) => {
            // Obtém as cores personalizadas do status para aplicar na borda e badge
            const cores = obterCoresStatus(obra.status)

            // Retorna o componente Card customizado para a obra atual
            return (
              // Reutiliza o componente Card passando a cor de destaque superior correspondente ao status
              <Card
                key={obra.id}
                accent={cores.borda}
                onClick={() => irParaDetalhes(obra.id)}
                className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between"
              >
                {/* Bloco superior com título da obra e status colorido */}
                <div>
                  {/* Linha que agrupa o título e o badge de status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    {/* Título da obra com destaque visual */}
                    <h3 className="text-lg font-bold text-navy hover:text-primary transition leading-snug">
                      {obra.titulo}
                    </h3>
                    {/* Badge colorido indicando o status atual da obra */}
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cores.badge}`}
                    >
                      {/* Ponto colorido indicador dentro do badge */}
                      <span className={`w-2 h-2 rounded-full ${cores.ponto}`}></span>
                      {/* Texto do status da obra */}
                      {obra.status}
                    </span>
                  </div>

                  {/* Informações detalhadas da obra (Endereço e Prazo) */}
                  <div className="space-y-2 mb-4 text-xs text-slate-600">

                    {/* Linha do endereço da obra */}
                    <div className="flex items-start gap-2">
                      {/* Ícone SVG de marcador de localização (pin) */}
                      <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {/* Texto do endereço completo */}
                      <span className="leading-relaxed">{obra.endereco}</span>
                    </div>

                    {/* Linha do prazo estimado da obra */}
                    <div className="flex items-center gap-2">
                      {/* Ícone SVG de calendário */}
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {/* Texto com a data de prazo de entrega */}
                      <span>Prazo estimado: <strong className="text-slate-700">{obra.prazo}</strong></span>
                    </div>

                  </div>

                  {/* Resumo financeiro rápido das parcelas da obra */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mb-4 text-xs">
                    <p className="font-semibold text-slate-700 mb-1.5">Pagamento das Parcelas:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Status da Parcela 1 */}
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-200">
                        <span className="text-slate-500">1ª Parcela:</span>
                        <span
                          className={`font-semibold capitalize text-[11px] ${
                            obra.parcela1?.situacao === 'paga' ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {obra.parcela1?.situacao || 'pendente'}
                        </span>
                      </div>
                      {/* Status da Parcela 2 */}
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-200">
                        <span className="text-slate-500">2ª Parcela:</span>
                        <span
                          className={`font-semibold capitalize text-[11px] ${
                            obra.parcela2?.situacao === 'paga' ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {obra.parcela2?.situacao || 'pendente'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rodapé do card contendo o valor total em destaque e o botão de ação */}
                <div className="border-t border-slate-100 pt-3 mt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Bloco de exibição do valor total contratado */}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Valor Total
                    </span>
                    <strong className="text-xl font-bold text-navy">
                      {formatarMoeda(obra.valorTotal)}
                    </strong>
                  </div>

                  {/* Botão de ação para navegar aos detalhes da obra */}
                  {/* Utiliza o componente Button do design system */}
                  <Button
                    variant="primary"
                    onClick={(evento) => {
                      // Evita a propagação do clique para a div pai do card (evita duplo disparo)
                      evento.stopPropagation()
                      // Chama a função de navegação passando o id da obra
                      irParaDetalhes(obra.id)
                    }}
                    className="w-full sm:w-auto"
                    icon="→"
                  >
                    Ver Detalhes
                  </Button>
                </div>

              </Card>
            )
          })}
        </section>
        {!carregando && !erro && obras.length === 0 && <p className="rounded-xl bg-white p-5 text-sm text-slate-500">Nenhuma obra está vinculada à sua conta.</p>}

      </main>
    </div>
  )
}
