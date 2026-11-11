// Importa o hook useState do React para controlar avisos de inspeção de obras
import { useState } from 'react'

// Importa os utilitários de navegação do react-router-dom
import { Link, useNavigate } from 'react-router-dom'

// Importa o componente reutilizável Card do sistema de design visual
import Card from '../components/Card.jsx'

// Importa o componente reutilizável Button do sistema de design visual
import Button from '../components/Button.jsx'

// Importa os dados das obras e a função auxiliar de obtenção de cores de status
import { obrasMock, obterCoresStatus } from '../data/obrasMock.js'

// Importa a lista mockada de colaboradores para buscar os dados do colaborador logado
import { colaboradoresMock } from '../data/colaboradoresMock.js'

// Importa a função para encerrar a sessão do usuário
import { encerrarSessao } from '../services/auth.js'

// Componente principal do Painel do Colaborador (/colaborador)
export default function Colaborador() {
  // Inicializa o hook de navegação do React Router
  const navigate = useNavigate()

  // Estado para armazenar aviso visual interativo sobre o canteiro da obra selecionada
  const [avisoCanteiro, setAvisoCanteiro] = useState(null)

  // Define o ID fixo do colaborador fake especificado pelo requisito (ID 1)
  const idColaboradorLogado = 1

  // Localiza o colaborador fake de ID 1 na lista mockada de colaboradores
  const colaboradorLogado = colaboradoresMock.find((colaborador) => colaborador.id === idColaboradorLogado) || {
    // Dados padrão de segurança caso a lista não retorne o item
    id: 1,
    // Nome do profissional
    nome: 'Carlos Eduardo da Silva',
    // Função operacional
    funcao: 'Mestre de Obras',
    // Telefone
    telefone: '(11) 98765-4321',
    // Obras atribuídas
    obrasAtribuidas: [1, 2],
  }

  // Filtra ESTRITAMENTE as obras atribuídas a este colaborador fake (sem exibir obras de outros)
  const minhasObras = obrasMock.filter((obra) => {
    // Verifica se o ID 1 está presente na lista de colaboradores da obra
    const estaNaListaDaObra = obra.colaboradores && obra.colaboradores.includes(idColaboradorLogado)
    // Verifica se o ID da obra está presente na lista de obras atribuídas do colaborador
    const estaNaListaDoColaborador = colaboradorLogado.obrasAtribuidas && colaboradorLogado.obrasAtribuidas.includes(obra.id)
    // Retorna verdadeiro se qualquer um dos dois critérios for atendido
    return estaNaListaDaObra || estaNaListaDoColaborador
  })

  // Quantidade total de obras atribuídas ao colaborador
  const totalMinhasObras = minhasObras.length

  // Quantidade de obras atribuídas que estão com status "Em andamento"
  const obrasEmAndamento = minhasObras.filter((obra) => obra.status === 'Em andamento').length

  // Quantidade de obras atribuídas com status "Agendada"
  const obrasAgendadas = minhasObras.filter((obra) => obra.status === 'Agendada').length

  // Quantidade de obras atribuídas com status "Aguardando conferência" ou "Concluída"
  const obrasAguardandoOuConcluidas = minhasObras.filter(
    (obra) => obra.status === 'Aguardando conferência' || obra.status === 'Concluída'
  ).length

  // Função para efetuar logout do colaborador e redirecionar para a tela de login
  function handleLogout() {
    // Limpa a sessão ativa no navegador
    encerrarSessao()
    // Redireciona o colaborador para o login
    navigate('/login')
  }

  // Função que exibe um aviso visual das informações de canteiro da obra
  function handleVerCanteiro(obra) {
    // Atualiza o estado com as informações operacionais da obra
    setAvisoCanteiro({
      // Identificador da obra
      id: obra.id,
      // Título da obra
      titulo: obra.titulo,
      // Endereço do canteiro
      endereco: obra.endereco,
      // Status operacional
      status: obra.status,
      // Prazo estimado
      prazo: obra.prazo,
      // Última etapa registrada no histórico
      ultimaEtapa: obra.timeline?.[obra.timeline.length - 1]?.descricao || 'Etapa inicial em planejamento.',
    })
  }

  // Renderiza a interface visual do colaborador
  return (
    // Contêiner principal com fundo suave padrão do sistema
    <div className="min-h-screen bg-background text-ink">

      {/* Barra de cabeçalho superior unificada com navegação */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        {/* Contêiner de alinhamento com layout flexível */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">

          {/* Logotipo e identificador do colaborador */}
          <div className="flex items-center gap-3">
            {/* Ícone com capacete / ferramentas em fundo esmeralda */}
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600 text-white text-lg font-bold" aria-hidden="true">
              🔨
            </span>
            {/* Identificação da área e do colaborador */}
            <div>
              {/* Nome da plataforma */}
              <strong className="block text-base leading-tight font-bold text-navy">
                Obra<span className="text-primary">Master</span>
              </strong>
              {/* Etiqueta indicando o painel do colaborador */}
              <small className="block text-[10px] tracking-wider text-emerald-700 uppercase font-bold">
                Painel do Colaborador
              </small>
            </div>
          </div>

          {/* Menu de navegação entre as telas do sistema */}
          <nav className="flex items-center flex-wrap gap-2 text-xs font-semibold" aria-label="Navegação do colaborador">
            {/* Link ativo para a tela do colaborador */}
            <Link
              to="/colaborador"
              className="py-1.5 px-3 rounded-md bg-emerald-700 text-white transition shadow-xs"
            >
              Minhas Obras
            </Link>
            {/* Link para a página de perfil */}
            <Link
              to="/perfil"
              className="py-1.5 px-3 rounded-md text-slate-600 hover:text-primary hover:bg-slate-100 transition"
            >
              Perfil
            </Link>
            {/* Botão para deslogar */}
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

      {/* Conteúdo principal da página */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Banner com informações do colaborador autenticado */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Informações pessoais e operacionais do colaborador */}
          <div className="flex items-center gap-3">
            {/* Avatar circular com as iniciais */}
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-base border border-emerald-200 shrink-0">
              CE
            </div>
            {/* Nome e cargo do profissional */}
            <div>
              {/* Nome do colaborador fake */}
              <h2 className="text-base sm:text-lg font-bold text-navy">
                {colaboradorLogado.nome}
              </h2>
              {/* Cargo e contato */}
              <p className="text-xs text-slate-500 mt-0.5">
                Função: <strong className="text-emerald-700">{colaboradorLogado.funcao}</strong> • Telefone: {colaboradorLogado.telefone}
              </p>
            </div>
          </div>

          {/* Etiqueta informando a política de visualização restrita (sem dados financeiros) */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 self-start sm:self-auto">
            <span className="block font-semibold text-slate-700">🔒 Acesso Operacional</span>
            <span className="text-[11px] text-slate-500">Exibição restrita a cronograma, canteiro e tarefas.</span>
          </div>
        </div>

        {/* Título da seção de métricas */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
            Meu Canteiro de Obras
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy">
            Obras sob Minha Responsabilidade
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe a localização, cronograma e status das obras em que você está alocado.
          </p>
        </div>

        {/* Grade de cartões de métricas (APENAS métricas físicas e operacionais, SEM valores financeiros) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" aria-label="Métricas do colaborador">

          {/* Cartão de métrica: Total de obras atribuídas */}
          <Card
            label="Obras Atribuídas"
            value={totalMinhasObras}
            accent="border-emerald-600"
            icon={
              // Ícone representativo de prancheta de tarefas
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />

          {/* Cartão de métrica: Obras em execução ativa */}
          <Card
            label="Em Andamento"
            value={obrasEmAndamento}
            accent="border-amber-500"
            icon={
              // Ícone representativo de execução ativa
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          {/* Cartão de métrica: Obras agendadas */}
          <Card
            label="Agendadas"
            value={obrasAgendadas}
            accent="border-sky-500"
            icon={
              // Ícone de calendário para obras futuras
              <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />

          {/* Cartão de métrica: Obras aguardando conferência ou já concluídas */}
          <Card
            label="Finalizadas / Vistoria"
            value={obrasAguardandoOuConcluidas}
            accent="border-purple-500"
            icon={
              // Ícone de vistoria ou conclusão
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

        </section>

        {/* Aviso visual interativo de detalhes operacionais do canteiro */}
        {avisoCanteiro && (
          // Caixa com detalhes do canteiro selecionado
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-900 shadow-xs">
            {/* Informações detalhadas do canteiro */}
            <div className="text-xs sm:text-sm">
              <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                <span>📍</span> Informações Operacionais da Obra #{avisoCanteiro.id}: {avisoCanteiro.titulo}
              </p>
              <p className="mt-1 text-slate-700">
                Local: <strong className="text-navy">{avisoCanteiro.endereco}</strong>
              </p>
              <p className="mt-0.5 text-slate-600">
                Status: <strong className="text-navy">{avisoCanteiro.status}</strong> • Prazo: <strong className="text-navy">{avisoCanteiro.prazo}</strong>
              </p>
              <p className="mt-1 text-xs text-slate-500 italic">
                Último registro de execução: "{avisoCanteiro.ultimaEtapa}"
              </p>
            </div>
            {/* Botão de fechamento */}
            <Button
              variant="outline"
              onClick={() => setAvisoCanteiro(null)}
              className="text-xs py-1 px-3 self-end sm:self-auto"
            >
              Fechar detalhes
            </Button>
          </div>
        )}

        {/* Título da seção de listagem */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-navy">
            Obras Atribuídas a Você ({totalMinhasObras})
          </h2>
          <span className="text-xs text-slate-500">
            Apenas obras com sua alocação confirmada
          </span>
        </div>

        {/* Grade de cartões das obras atribuídas (mobile-first: 1 col celular, 2 col desktop) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6" aria-label="Lista de obras do colaborador">
          {/* Percorre apenas as obras atribuídas ao colaborador fake de ID 1 */}
          {minhasObras.map((obra) => {
            // Obtém as cores personalizadas do status atual da obra
            const cores = obterCoresStatus(obra.status)

            // Retorna o Card da obra sem nenhuma informação financeira
            return (
              // Reutiliza o componente Card com a borda colorida do status
              <Card
                key={obra.id}
                accent={cores.borda}
                className="flex flex-col justify-between"
              >
                {/* Parte superior do cartão */}
                <div>
                  {/* Linha com título da obra e badge de status */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      {/* Título da obra */}
                      <h3 className="text-base sm:text-lg font-bold text-navy leading-snug">
                        {obra.titulo}
                      </h3>
                      {/* Nome do cliente responsável pela contratação */}
                      <p className="text-xs text-slate-500 mt-0.5">
                        Cliente: <strong className="text-slate-700">{obra.cliente || 'Não informado'}</strong>
                      </p>
                    </div>

                    {/* Badge de status colorido com ponto indicador */}
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cores.badge}`}
                    >
                      {/* Ponto colorido */}
                      <span className={`w-2 h-2 rounded-full ${cores.ponto}`}></span>
                      {/* Nome do status */}
                      {obra.status}
                    </span>
                  </div>

                  {/* Informações de localização do canteiro e cronograma */}
                  <div className="mt-3 space-y-2 text-xs text-slate-600">

                    {/* Linha com o endereço completo do canteiro */}
                    <div className="flex items-start gap-2">
                      {/* Ícone de alfinete de mapa */}
                      <span className="text-slate-400 mt-0.5 text-sm" aria-hidden="true">📍</span>
                      {/* Endereço completo */}
                      <div>
                        <strong className="block text-slate-700">Endereço do Canteiro:</strong>
                        <span className="leading-relaxed text-slate-600">{obra.endereco}</span>
                      </div>
                    </div>

                    {/* Linha com a previsão de entrega */}
                    <div className="flex items-start gap-2">
                      {/* Ícone de calendário */}
                      <span className="text-slate-400 mt-0.5 text-sm" aria-hidden="true">📅</span>
                      {/* Prazo */}
                      <div>
                        <strong className="block text-slate-700">Prazo Previsto:</strong>
                        <span className="text-slate-600">{obra.prazo}</span>
                      </div>
                    </div>

                  </div>

                  {/* Resumo das etapas físicas da obra (timeline sem valores) */}
                  {obra.timeline && obra.timeline.length > 0 && (
                    <div className="mt-4 bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs">
                      {/* Título do bloco de etapas */}
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-2">
                        Histórico de Execução Física:
                      </span>
                      {/* Linhas da timeline com as últimas etapas */}
                      <div className="space-y-1.5">
                        {/* Exibe até as 2 últimas etapas registradas */}
                        {obra.timeline.slice(-2).map((item, index) => (
                          <div key={index} className="flex items-start gap-2 text-slate-600">
                            {/* Marcador circular pequeno */}
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                            {/* Data e descrição da etapa */}
                            <p className="leading-relaxed">
                              <strong className="text-slate-700">{item.data} ({item.tipo}):</strong> {item.descricao}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Rodapé do cartão contendo apenas as ações operacionais (sem valores financeiros) */}
                <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between gap-3">
                  {/* Informação visual de status operacional */}
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <span>🏗️</span> Canteiro Ativo
                  </span>

                  {/* Ações operacionais da obra */}
                  <div className="flex items-center gap-2">
                    {/* Botão para visualizar resumo do canteiro */}
                    <Button
                      variant="outline"
                      onClick={() => handleVerCanteiro(obra)}
                      className="text-xs py-1.5 px-3"
                    >
                      Ver Canteiro
                    </Button>
                    {/* Botão que leva à página de registro de andamento da obra */}
                    <Button
                      variant="compact"
                      onClick={() => navigate(`/colaborador/obra/${obra.id}`)}
                      className="text-xs py-1.5 px-3"
                      icon="→"
                    >
                      Gerenciar obra
                    </Button>
                  </div>
                </div>

              </Card>
            )
          })}
        </section>

      </main>
    </div>
  )
}
