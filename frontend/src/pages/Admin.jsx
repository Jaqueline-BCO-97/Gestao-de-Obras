// Importa os hooks de navegação do react-router-dom para transição entre telas
import { useNavigate, Link } from 'react-router-dom'

// Importa o componente reutilizável Card do sistema de design visual
import Card from '../components/Card.jsx'

// Importa o componente reutilizável Button do sistema de design visual
import Button from '../components/Button.jsx'

// Importa a lista mockada de obras e as funções utilitárias de moeda e status
import { obrasMock, formatarMoeda, obterCoresStatus } from '../data/obrasMock.js'

// Importa a lista mockada de colaboradores para cruzar os dados dos membros da equipe
import { colaboradoresMock } from '../data/colaboradoresMock.js'

// Importa a função de logout do serviço de autenticação
import { encerrarSessao } from '../services/auth.js'

// Componente principal da página de Dashboard do Administrador (/admin)
export default function Admin() {
  // Inicializa o hook de navegação programática
  const navigate = useNavigate()

  // Quantidade total de obras registradas no sistema
  const totalObras = obrasMock.length

  // Quantidade de obras com status "Agendada"
  const obrasAgendadas = obrasMock.filter((obra) => obra.status === 'Agendada').length

  // Quantidade de obras com status "Em andamento"
  const obrasEmAndamento = obrasMock.filter((obra) => obra.status === 'Em andamento').length

  // Quantidade de obras com status "Aguardando conferência"
  const obrasAguardando = obrasMock.filter((obra) => obra.status === 'Aguardando conferência').length

  // Quantidade de obras com status "Concluída"
  const obrasConcluidas = obrasMock.filter((obra) => obra.status === 'Concluída').length

  // Calcula o valor total financeiro a receber somando todas as parcelas pendentes
  const valorTotalAReceber = obrasMock.reduce((acumulador, obra) => {
    // Valor da primeira parcela se estiver com situação pendente
    const valorParcela1Pendente = obra.parcela1?.situacao === 'pendente' ? obra.parcela1.valor : 0
    // Valor da segunda parcela se estiver com situação pendente
    const valorParcela2Pendente = obra.parcela2?.situacao === 'pendente' ? obra.parcela2.valor : 0
    // Soma os valores pendentes ao total acumulado
    return acumulador + valorParcela1Pendente + valorParcela2Pendente
  }, 0)

  // Função para deslogar o administrador e retornar à tela inicial de login
  function handleLogout() {
    // Limpa os dados de sessão salvos no navegador
    encerrarSessao()
    // Redireciona o usuário para a rota de login
    navigate('/login')
  }

  // Função auxiliar para obter os nomes dos colaboradores alocados em uma obra
  function obterNomesColaboradores(idsColaboradores = []) {
    // Filtra a lista de colaboradores procurando quem possui ID presente na lista da obra
    return colaboradoresMock
      // Filtra os colaboradores pelos IDs correspondentes
      .filter((colaborador) => idsColaboradores.includes(colaborador.id))
      // Mapeia para retornar apenas o primeiro nome e sobrenome
      .map((colaborador) => colaborador.nome)
  }

  // Renderiza a interface do Dashboard do Administrador
  return (
    // Contêiner principal com fundo cinza suave e altura mínima de 100vh
    <div className="min-h-screen bg-background text-ink">

      {/* Barra de cabeçalho superior (Header) com navegação unificada */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        {/* Contêiner com alinhamento flexível e limites de largura */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">

          {/* Logotipo da aplicação e indicador de visão do administrador */}
          <div className="flex items-center gap-3">
            {/* Ícone com fundo azul marinho */}
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy text-white text-lg font-bold" aria-hidden="true">
              ⚙
            </span>
            {/* Informações da marca e perfil logado */}
            <div>
              {/* Nome do sistema */}
              <strong className="block text-base leading-tight font-bold text-navy">
                Obra<span className="text-primary">Master</span>
              </strong>
              {/* Etiqueta identificando a visão do administrador */}
              <small className="block text-[10px] tracking-wider text-amber-600 uppercase font-bold">
                Painel do Administrador
              </small>
            </div>
          </div>

          {/* Menu de navegação entre as telas do sistema */}
          <nav className="flex items-center flex-wrap gap-2 text-xs font-semibold" aria-label="Menu principal">
            {/* Link ativo para a página inicial do admin */}
            <Link
              to="/admin"
              className="py-1.5 px-3 rounded-md bg-navy text-white transition shadow-xs"
            >
              Dashboard
            </Link>
            {/* Link direto para a tela de Gestão de Obras */}
            <Link
              to="/admin/obras"
              className="py-1.5 px-3 rounded-md text-slate-600 hover:text-primary hover:bg-slate-100 transition"
            >
              Gestão de Obras
            </Link>
            {/* Link alternativo para visualizar a perspectiva do colaborador */}
            <Link
              to="/colaborador"
              className="py-1.5 px-3 rounded-md text-slate-600 hover:text-primary hover:bg-slate-100 transition"
            >
              Visão Colaborador
            </Link>
            {/* Link para a tela de perfil */}
            <Link
              to="/perfil"
              className="py-1.5 px-3 rounded-md text-slate-600 hover:text-primary hover:bg-slate-100 transition"
            >
              Perfil
            </Link>
            {/* Botão de logout com estilo outline */}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-xs py-1.5 px-3"
            >
              Sair
            </Button>
          </nav>

        </div>
      </header>

      {/* Conteúdo principal do painel */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Cabeçalho da página com saudação e atalho rápido */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          {/* Informações de introdução */}
          <div>
            {/* Categoria superior da tela */}
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
              Visão Geral Administrativa
            </p>
            {/* Título principal do dashboard */}
            <h1 className="text-2xl sm:text-3xl font-bold text-navy">
              Painel de Controle
            </h1>
            {/* Subtítulo informativo */}
            <p className="mt-1 text-sm text-slate-500">
              Acompanhamento centralizado de todas as obras, faturamento a receber e alocação de equipes.
            </p>
          </div>

          {/* Botão de atalho rápido direto para a página de gestão de obras */}
          <Button
            variant="primary"
            onClick={() => navigate('/admin/obras')}
            className="self-start sm:self-auto text-xs py-2.5 px-4"
            icon="→"
          >
            Acessar Gestão de Obras
          </Button>
        </div>

        {/* Grade de cartões de métricas do sistema (mobile-first: 1 col celular, 2 tablet, 3 desktop) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8" aria-label="Métricas gerais">

          {/* Card de métrica: Total de obras cadastradas */}
          <Card
            label="Total de Obras"
            value={totalObras}
            accent="border-navy"
            icon={
              // Ícone representativo de pastas / total de projetos
              <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />

          {/* Card de métrica: Obras em andamento */}
          <Card
            label="Em Andamento"
            value={obrasEmAndamento}
            accent="border-amber-500"
            icon={
              // Ícone de relógio / execução
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          {/* Card de métrica: Obras aguardando conferência */}
          <Card
            label="Aguardando Conferência"
            value={obrasAguardando}
            accent="border-purple-500"
            icon={
              // Ícone de prancheta de inspeção
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
          />

          {/* Card de métrica: Obras concluídas */}
          <Card
            label="Concluídas"
            value={obrasConcluidas}
            accent="border-emerald-500"
            icon={
              // Ícone de verificação / concluído
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            }
          />

          {/* Card de métrica: Obras agendadas */}
          <Card
            label="Agendadas"
            value={obrasAgendadas}
            accent="border-sky-500"
            icon={
              // Ícone de calendário / data futura
              <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />

          {/* Card de métrica financeira: Valor total a receber (parcelas pendentes) */}
          <Card
            label="Valor Total a Receber"
            value={formatarMoeda(valorTotalAReceber)}
            accent="border-primary"
            icon={
              // Ícone de moeda / finanças
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

        </section>

        {/* Seção com resumo das obras recentes e link para gestão completa */}
        <section aria-labelledby="titulo-obras-recentes">

          {/* Barra de cabeçalho da listagem de obras recentes */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            {/* Título com contador de obras */}
            <div>
              {/* Título da seção */}
              <h2 id="titulo-obras-recentes" className="text-lg font-bold text-navy">
                Obras Recentes no Sistema ({totalObras})
              </h2>
              {/* Instrução visual para o usuário */}
              <p className="text-xs text-slate-500">
                Acompanhamento ágil com status, cliente e equipe alocada em cada obra.
              </p>
            </div>

            {/* Link textual para acessar a tabela completa em /admin/obras */}
            <Link
              to="/admin/obras"
              className="text-xs font-semibold text-primary hover:text-primary-dark transition flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Ver tabela completa de obras</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Grade responsiva com os cards das obras recentes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Percorre cada uma das obras cadastradas na base mockada */}
            {obrasMock.map((obra) => {
              // Obtém o estilo visual e cores correspondentes ao status da obra
              const cores = obterCoresStatus(obra.status)
              // Obtém os nomes dos colaboradores alocados nesta obra específica
              const nomesColaboradores = obterNomesColaboradores(obra.colaboradores)

              // Retorna a renderização do card reutilizável
              return (
                // Reutiliza o componente Card com a borda do status
                <Card
                  key={obra.id}
                  accent={cores.borda}
                  className="flex flex-col justify-between"
                >
                  {/* Bloco superior com título, cliente e status */}
                  <div>
                    {/* Linha com título e badge de status */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      {/* Título da obra */}
                      <div>
                        {/* Nome da obra */}
                        <h3 className="text-base font-bold text-navy leading-snug">
                          {obra.titulo}
                        </h3>
                        {/* Nome do cliente responsável */}
                        <p className="text-xs text-slate-500 mt-0.5">
                          Cliente: <strong className="text-slate-700">{obra.cliente || 'Não informado'}</strong>
                        </p>
                      </div>

                      {/* Badge colorido com o status atual */}
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cores.badge}`}
                      >
                        {/* Ponto indicador */}
                        <span className={`w-2 h-2 rounded-full ${cores.ponto}`}></span>
                        {/* Nome do status */}
                        {obra.status}
                      </span>
                    </div>

                    {/* Informações detalhadas de endereço e prazo */}
                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      {/* Linha com o endereço */}
                      <div className="flex items-start gap-1.5">
                        {/* Ícone de alfinete de mapa */}
                        <span className="text-slate-400 mt-0.5">📍</span>
                        {/* Endereço completo */}
                        <span className="leading-relaxed">{obra.endereco}</span>
                      </div>
                      {/* Linha com o prazo previsto */}
                      <div className="flex items-center gap-1.5">
                        {/* Ícone de calendário */}
                        <span className="text-slate-400">📅</span>
                        {/* Data limite */}
                        <span>Prazo de entrega: <strong className="text-slate-700">{obra.prazo}</strong></span>
                      </div>
                    </div>

                    {/* Bloco de colaboradores alocados */}
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                      {/* Rótulo da equipe alocada */}
                      <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                        Equipe Alocada:
                      </span>
                      {/* Lista de tags com os nomes dos colaboradores */}
                      <div className="flex flex-wrap gap-1.5">
                        {/* Mapeia os nomes dos colaboradores ou exibe aviso se não houver nenhum */}
                        {nomesColaboradores.length > 0 ? (
                          nomesColaboradores.map((nome, indice) => (
                            // Tag estilizada para cada colaborador
                            <span
                              key={indice}
                              className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] border border-slate-200"
                            >
                              👤 {nome}
                            </span>
                          ))
                        ) : (
                          // Mensagem quando não houver equipe alocada
                          <span className="text-slate-400 italic text-[11px]">Nenhum colaborador alocado</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bloco inferior com valor total e botão que leva para a gestão */}
                  <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between gap-3">
                    {/* Exibição do valor total do contrato */}
                    <div>
                      {/* Rótulo em caixa alta */}
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Valor Total
                      </span>
                      {/* Valor formatado em moeda brasileira */}
                      <strong className="text-lg font-bold text-navy">
                        {formatarMoeda(obra.valorTotal)}
                      </strong>
                    </div>

                    {/* Botão para acessar a tela de gestão detalhada */}
                    <Button
                      variant="compact"
                      onClick={() => navigate('/admin/obras')}
                      className="text-xs"
                      icon="→"
                    >
                      Gerenciar
                    </Button>
                  </div>

                </Card>
              )
            })}
          </div>

        </section>

        {/* Banner de navegação rápida complementar para reforçar o link para /admin/obras */}
        <div className="mt-8 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Texto explicativo */}
          <div>
            {/* Título do banner */}
            <h3 className="text-base font-bold text-navy">
              Deseja visualizar todas as obras em tabela completa e filtrar por status?
            </h3>
            {/* Descrição dos recursos disponíveis na outra rota */}
            <p className="text-xs text-slate-500 mt-1">
              Acesse a tela de Gestão de Obras para filtrar por status, analisar equipe alocada e valores.
            </p>
          </div>

          {/* Botão de navegação */}
          <Button
            variant="primary"
            onClick={() => navigate('/admin/obras')}
            className="shrink-0 text-xs py-2.5 px-4"
          >
            Ir para Gestão de Obras (/admin/obras)
          </Button>
        </div>

      </main>
    </div>
  )
}
