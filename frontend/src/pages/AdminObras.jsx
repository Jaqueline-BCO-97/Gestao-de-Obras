// Importa o hook useState do React para controlar filtros e avisos na tela
import { useState } from 'react'

// Importa os componentes de navegação do react-router-dom
import { Link, useNavigate } from 'react-router-dom'

// Importa o componente reutilizável Card do sistema de design
import Card from '../components/Card.jsx'

// Importa o componente reutilizável Button do sistema de design
import Button from '../components/Button.jsx'

// Importa os dados das obras e as funções de moeda e cores
import { obrasMock, formatarMoeda, obterCoresStatus } from '../data/obrasMock.js'

// Importa a lista de colaboradores mockados para exibir os membros da equipe alocada
import { colaboradoresMock } from '../data/colaboradoresMock.js'

// Importa a função de logout para permitir ao administrador encerrar a sessão
import { encerrarSessao } from '../services/auth.js'

// Componente da página de Gestão de Obras do Administrador (/admin/obras)
export default function AdminObras() {
  // Inicializa o hook de navegação para alternar entre rotas
  const navigate = useNavigate()

  // Estado para armazenar o status selecionado no filtro (padrão 'Todos')
  const [filtroStatus, setFiltroStatus] = useState('Todos')

  // Estado para armazenar o aviso de visualização ao clicar no botão "Ver"
  const [avisoVisual, setAvisoVisual] = useState(null)

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
    ? obrasMock
    // Caso contrário, filtra pelo status exato selecionado
    : obrasMock.filter((obra) => obra.status === filtroStatus)

  // Função para deslogar da conta e voltar ao login
  function handleLogout() {
    // Apaga os dados de sessão do navegador
    encerrarSessao()
    // Redireciona para a página de login
    navigate('/login')
  }

  // Função auxiliar para buscar os colaboradores completos a partir de uma lista de IDs
  function obterColaboradores(idsColaboradores = []) {
    // Retorna os objetos de colaborador correspondentes aos IDs recebidos
    return colaboradoresMock.filter((colaborador) => idsColaboradores.includes(colaborador.id))
  }

  // Função disparada ao clicar no botão visual "Ver" de uma obra
  function handleVerObra(obra) {
    // Atualiza o estado com as informações da obra clicada para exibir um aviso visual amigável
    setAvisoVisual({
      // Identificador da obra selecionada
      id: obra.id,
      // Título da obra
      titulo: obra.titulo,
      // Cliente responsável
      cliente: obra.cliente,
      // Status atual
      status: obra.status,
      // Valor formatado
      valor: formatarMoeda(obra.valorTotal),
    })
  }

  // Renderiza a interface da página de Gestão de Obras
  return (
    // Contêiner de tela cheia com fundo claro padrão e tipografia padrão
    <div className="min-h-screen bg-background text-ink">

      {/* Barra de cabeçalho superior unificada */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        {/* Contêiner interno com layout flexível */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">

          {/* Logotipo e identificador da rota */}
          <div className="flex items-center gap-3">
            {/* Ícone de prancheta */}
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy text-white text-lg font-bold" aria-hidden="true">
              📋
            </span>
            {/* Título e subtítulo do sistema */}
            <div>
              {/* Nome da plataforma */}
              <strong className="block text-base leading-tight font-bold text-navy">
                Obra<span className="text-primary">Master</span>
              </strong>
              {/* Identificador do painel administrativo */}
              <small className="block text-[10px] tracking-wider text-amber-600 uppercase font-bold">
                Gestão de Obras
              </small>
            </div>
          </div>

          {/* Menu de navegação entre as telas */}
          <nav className="flex items-center flex-wrap gap-2 text-xs font-semibold" aria-label="Menu de navegação">
            {/* Link para o Dashboard do Administrador */}
            <Link
              to="/admin"
              className="py-1.5 px-3 rounded-md text-slate-600 hover:text-primary hover:bg-slate-100 transition"
            >
              Dashboard
            </Link>
            {/* Link ativo da página atual de Gestão de Obras */}
            <Link
              to="/admin/obras"
              className="py-1.5 px-3 rounded-md bg-navy text-white transition shadow-xs"
            >
              Gestão de Obras
            </Link>
            {/* Link para a página de Perfil */}
            <Link
              to="/perfil"
              className="py-1.5 px-3 rounded-md text-slate-600 hover:text-primary hover:bg-slate-100 transition"
            >
              Perfil
            </Link>
            {/* Botão para encerrar a sessão */}
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
              {obrasFiltradas.length} de {obrasMock.length} obras
            </strong>
          </div>
        </div>

        {/* Aviso visual informativo disparado ao clicar no botão "Ver" de qualquer obra */}
        {avisoVisual && (
          // Caixa de notificação com estilo de alerta suave
          <div className="mb-6 bg-sky-50 border border-sky-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sky-900 shadow-xs">
            {/* Conteúdo descritivo da obra clicada */}
            <div className="text-xs sm:text-sm">
              {/* Título em negrito do aviso */}
              <p className="font-bold flex items-center gap-1.5 text-primary">
                {/* Ícone de informação */}
                <span>ℹ️</span> Visualização da Obra #{avisoVisual.id}: {avisoVisual.titulo}
              </p>
              {/* Detalhes rápidos da obra */}
              <p className="mt-1 text-slate-600">
                Cliente: <strong className="text-navy">{avisoVisual.cliente}</strong> | Status: <strong className="text-navy">{avisoVisual.status}</strong> | Valor Total: <strong className="text-navy">{avisoVisual.valor}</strong>
              </p>
            </div>
            {/* Botão para fechar o aviso visual */}
            <Button
              variant="outline"
              onClick={() => setAvisoVisual(null)}
              className="text-xs py-1 px-3 self-end sm:self-auto"
            >
              Fechar aviso
            </Button>
          </div>
        )}

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
                ? obrasMock.length
                : obrasMock.filter((o) => o.status === opcao).length

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

        {/* Bloco da tabela: com overflow-x-auto restrito ao próprio bloco para rolagem em celulares */}
        <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

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
                    const colaboradoresAlocados = obterColaboradores(obra.colaboradores)

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
                          {/* Botão visual para acionar o aviso da obra */}
                          <Button
                            variant="compact"
                            onClick={() => handleVerObra(obra)}
                            className="text-xs py-1 px-3"
                          >
                            Ver
                          </Button>
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
