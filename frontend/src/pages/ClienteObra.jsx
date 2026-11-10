// Importa os hooks useParams, useNavigate e Link do react-router-dom para lidar com parâmetros de rota e navegação
import { useParams, useNavigate, Link } from 'react-router-dom'

// Importa o componente reutilizável Card do sistema de design
import Card from '../components/Card.jsx'

// Importa o componente reutilizável Button do sistema de design
import Button from '../components/Button.jsx'

// Importa os dados das obras mockadas e as funções auxiliares de formatação e cores
import { obrasMock, formatarMoeda, obterCoresStatus } from '../data/obrasMock.js'

// Componente da página de Detalhes da Obra do Cliente (/cliente/obra/:id)
export default function ClienteObra() {
  // Extrai o parâmetro dinâmico ":id" presente na URL do navegador
  const { id } = useParams()

  // Inicializa o hook de navegação para permitir retornar ao painel via código
  const navigate = useNavigate()

  // Busca na lista mockada a obra que possui o id correspondente ao parâmetro da URL
  // Converte ambos para string para garantir comparação segura caso o id venha como número ou texto
  const obra = obrasMock.find((item) => String(item.id) === String(id))

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
            Não foi possível localizar nenhuma obra cadastrada com o identificador <code className="font-mono font-bold text-primary bg-slate-100 px-1.5 py-0.5 rounded">#{id}</code>.
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

  // Paleta de gradientes em Tailwind usada como placeholder para os blocos de fotos (sem imagens externas)
  const gradientesFotos = [
    'from-blue-100 via-sky-200 to-indigo-200 text-sky-800',
    'from-amber-100 via-orange-200 to-yellow-200 text-amber-800',
    'from-emerald-100 via-teal-200 to-green-200 text-emerald-800',
    'from-purple-100 via-violet-200 to-fuchsia-200 text-purple-800',
  ]

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
              {/* Exibe a data de pagamento ou vencimento */}
              <p className="mt-1 text-[11px] text-slate-400">
                {obra.parcela1.situacao === 'paga'
                  ? `Pago em: ${obra.parcela1.pagamento}`
                  : `Vencimento: ${obra.parcela1.vencimento}`}
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
              {/* Exibe a data de pagamento ou vencimento */}
              <p className="mt-1 text-[11px] text-slate-400">
                {obra.parcela2.situacao === 'paga'
                  ? `Pago em: ${obra.parcela2.pagamento}`
                  : `Vencimento: ${obra.parcela2.vencimento}`}
              </p>
            </Card>

          </div>
        </section>

        {/* Bloco 3: Galeria de Fotos (Blocos de cor como placeholder, sem imagens externas) */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-sm" aria-label="Galeria de fotos">
          {/* Cabeçalho da seção de fotos */}
          <div className="mb-5">
            <h2 className="text-lg font-bold text-navy">
              Galeria de Fotos da Obra ({obra.fotos.length})
            </h2>
            <p className="text-xs text-slate-500">
              Registros visuais de cada etapa da obra (utilizando blocos de cor como placeholder).
            </p>
          </div>

          {/* Grade responsiva de fotos (mobile: 1 coluna, sm: 2 colunas, lg: 4 colunas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Itera sobre a lista de nomes fictícios de fotos */}
            {obra.fotos.map((nomeFoto, indice) => {
              // Seleciona um gradiente ciclicamente para dar variação visual
              const estiloGradiente = gradientesFotos[indice % gradientesFotos.length]

              // Retorna o bloco de cor como placeholder para a foto
              return (
                // Caixa externa de cada registro fotográfico
                <div
                  key={indice}
                  className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col hover:shadow-md transition duration-200"
                >
                  {/* Bloco colorido simulando a foto real (placeholder visual com gradiente suave) */}
                  <div
                    className={`h-36 sm:h-40 bg-gradient-to-br ${estiloGradiente} flex flex-col items-center justify-center p-4 text-center select-none`}
                  >
                    {/* Ícone de câmera fotográfica em SVG */}
                    <svg className="w-10 h-10 mb-2 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {/* Número do registro fotográfico */}
                    <span className="text-xs font-bold uppercase tracking-wider opacity-90">
                      Registro #{indice + 1}
                    </span>
                  </div>

                  {/* Legenda com o nome fictício do arquivo */}
                  <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs">
                    {/* Nome do arquivo da foto */}
                    <span className="font-mono text-[11px] text-slate-600 truncate" title={nomeFoto}>
                      {nomeFoto}
                    </span>
                    {/* Selo indicativo de arquivo simulado */}
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                      Mock
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Bloco 4: Linha do Tempo Vertical (Timeline de Eventos da Obra) */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-sm" aria-label="Evolução da obra">
          {/* Cabeçalho da linha do tempo */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-navy">
              Evolução da Obra (Timeline)
            </h2>
            <p className="text-xs text-slate-500">
              Histórico de eventos, serviços executados e vistorias registradas.
            </p>
          </div>

          {/* Estrutura da linha do tempo vertical com linha conectora cinza */}
          <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 ml-3 sm:ml-4 space-y-6">
            {/* Mapeia a lista de eventos cronológicos da obra */}
            {obra.timeline.map((evento, indice) => (
              // Contêiner relativo de cada evento individual da timeline
              <div key={indice} className="relative group">
                {/* Marcador circular sobreposto à linha vertical */}
                <div
                  className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border-2 border-white bg-primary shadow-sm group-hover:scale-125 transition-transform"
                  aria-hidden="true"
                ></div>

                {/* Caixa de detalhes do evento */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:bg-white hover:shadow-sm transition">
                  {/* Linha com a data e o tipo do evento */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    {/* Badge do tipo do evento */}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
                      {evento.tipo}
                    </span>

                    {/* Data em que o evento ocorreu */}
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      {/* Ícone pequeno de relógio */}
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {evento.data}
                    </span>
                  </div>

                  {/* Descrição em texto detalhando a evolução registrada neste marco */}
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {evento.descricao}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

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
