// Importa os hooks useNavigate e Link do react-router-dom para navegação interna entre páginas
import { useNavigate, Link } from 'react-router-dom'

// Importa o componente reutilizável Card do sistema de design
import Card from '../components/Card.jsx'

// Importa o componente reutilizável Button do sistema de design
import Button from '../components/Button.jsx'

// Importa a lista de dados mockados e as funções auxiliares de formatação e cores
import { obrasMock, formatarMoeda, obterCoresStatus } from '../data/obrasMock.js'

// Importa a função de logout para permitir que o cliente encerre a sua sessão
import { encerrarSessao } from '../services/auth.js'

// Componente principal da página do Painel do Cliente (/cliente)
export default function Cliente() {
  // Inicializa o hook de navegação do React Router para trocar de rota via código
  const navigate = useNavigate()

  // Calcula a quantidade total de obras cadastradas na lista mockada
  const totalObras = obrasMock.length

  // Calcula a quantidade de obras que estão atualmente com status "Em andamento"
  const obrasEmAndamento = obrasMock.filter((obra) => obra.status === 'Em andamento').length

  // Calcula a quantidade de obras que já foram finalizadas com status "Concluída"
  const obrasConcluidas = obrasMock.filter((obra) => obra.status === 'Concluída').length

  // Função disparada quando o usuário clica no botão de sair (logout)
  function handleLogout() {
    // Executa a função que limpa o token de autenticação e os dados salvos
    encerrarSessao()
    // Redireciona o usuário de volta para a tela de login
    navigate('/login')
  }

  // Função responsável por navegar para os detalhes da obra ao clicar em um card
  function irParaDetalhes(id) {
    // Redireciona o navegador para a rota de detalhes da obra com o id correspondente
    navigate(`/cliente/obra/${id}`)
  }

  // Retorna a estrutura visual completa da página do cliente
  return (
    // Contêiner principal com cor de fundo padrão e altura mínima cobrindo toda a tela
    <div className="min-h-screen bg-background text-ink">

      {/* Barra de navegação superior (Header) */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        {/* Contêiner interno do cabeçalho com alinhamento flexível e espaçamento responsivo */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">

          {/* Logotipo e identificador da aplicação */}
          <div className="flex items-center gap-3">
            {/* Ícone de casinha com fundo azul representando a marca */}
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-white text-lg font-bold" aria-hidden="true">
              ⌂
            </span>
            {/* Título e subtítulo do sistema */}
            <div>
              {/* Nome da plataforma com destaque na segunda palavra */}
              <strong className="block text-base leading-tight font-bold text-navy">
                Obra<span className="text-primary">Master</span>
              </strong>
              {/* Etiqueta pequena indicando a área do cliente */}
              <small className="block text-[10px] tracking-wider text-slate-500 uppercase font-semibold">
                Painel do Cliente
              </small>
            </div>
          </div>

          {/* Área de ações do usuário no cabeçalho */}
          <div className="flex items-center gap-3">
            {/* Link direto para a página de perfil do usuário logado */}
            <Link
              to="/perfil"
              className="text-xs font-semibold text-slate-600 hover:text-primary transition py-1.5 px-3 rounded-md hover:bg-slate-100"
            >
              Meu Perfil
            </Link>
            {/* Botão de encerrar sessão reutilizando o componente Button com variante outline */}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-xs py-1.5 px-3"
            >
              Sair
            </Button>
          </div>

        </div>
      </header>

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

        {/* Grade de cartões de métricas rápidas (reutilizando Card.jsx) */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8" aria-label="Resumo de métricas">

          {/* Cartão de métrica: Total de obras cadastradas */}
          <Card
            label="Total de Obras"
            value={totalObras}
            accent="border-navy"
            icon={
              // Ícone SVG representando prancheta / lista de projetos
              <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />

          {/* Cartão de métrica: Obras atualmente em andamento */}
          <Card
            label="Em Andamento"
            value={obrasEmAndamento}
            accent="border-amber-500"
            icon={
              // Ícone SVG representando ferramentas / obra em execução
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          {/* Cartão de métrica: Obras concluídas com sucesso */}
          <Card
            label="Concluídas"
            value={obrasConcluidas}
            accent="border-emerald-500"
            icon={
              // Ícone SVG representando check / sucesso
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

        </section>

        {/* Título da seção de listagem de obras */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-navy">
            Obras Cadastradas ({totalObras})
          </h2>
          <span className="text-xs text-slate-500">
            Clique em qualquer obra para ver os detalhes completos
          </span>
        </div>

        {/* Grade responsiva de cartões de obras (mobile-first: 1 coluna no mobile, 2 em tablets e desktops) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6" aria-label="Lista de obras">
          {/* Itera sobre o array de obras fake para gerar cada card */}
          {obrasMock.map((obra) => {
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
                            obra.parcela1.situacao === 'paga' ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {obra.parcela1.situacao}
                        </span>
                      </div>
                      {/* Status da Parcela 2 */}
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-200">
                        <span className="text-slate-500">2ª Parcela:</span>
                        <span
                          className={`font-semibold capitalize text-[11px] ${
                            obra.parcela2.situacao === 'paga' ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {obra.parcela2.situacao}
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

      </main>
    </div>
  )
}
