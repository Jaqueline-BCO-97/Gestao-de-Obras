// Importa os hooks useState e useEffect do React para controle de estado e efeitos
import { useState, useEffect } from 'react'

// Importa os hooks useParams, useNavigate e Link do react-router-dom para lidar com rotas e navegação
import { useParams, useNavigate, Link } from 'react-router-dom'

// Importa o componente reutilizável Button do sistema de design visual
import Button from '../components/Button.jsx'

// Importa a lista mockada de obras e a função auxiliar de cores de status
import { obrasMock, obterCoresStatus } from '../data/obrasMock.js'

// Importa a lista mockada de colaboradores para cruzar os dados do colaborador fake
import { colaboradoresMock } from '../data/colaboradoresMock.js'

// Componente da página de Registro de Andamento da Obra pelo Colaborador (/colaborador/obra/:id)
export default function ColaboradorObra() {
  // Extrai o parâmetro dinâmico ":id" presente na rota da URL
  const { id } = useParams()

  // Inicializa o hook de navegação do React Router para transições de página
  const navigate = useNavigate()

  // Define o ID fixo do colaborador fake estabelecido pelo projeto (ID 1 - Carlos Eduardo)
  const idColaboradorLogado = 1

  // Localiza os dados do colaborador logado na lista mockada
  const colaboradorLogado = colaboradoresMock.find((c) => c.id === idColaboradorLogado) || {
    // Identificador padrão
    id: 1,
    // Nome do profissional
    nome: 'Carlos Eduardo da Silva',
    // Função operacional
    funcao: 'Mestre de Obras',
    // Lista de obras atribuídas
    obrasAtribuidas: [1, 2],
  }

  // Busca na lista mockada a obra cujo identificador coincide com o ID da rota
  const obra = obrasMock.find((item) => String(item.id) === String(id))

  // Estado para armazenar o tipo de registro selecionado no formulário
  const [tipoRegistro, setTipoRegistro] = useState('Atualização de andamento')

  // Estado para armazenar o texto da anotação/descrição digitada pelo colaborador
  const [textoDescricao, setTextoDescricao] = useState('')

  // Estado para armazenar os arquivos de fotos escolhidos com seus respectivos previews
  const [fotosSelecionadas, setFotosSelecionadas] = useState([])

  // Estado para controlar mensagens de erro de validação (ex.: campo de texto vazio)
  const [erroValidacao, setErroValidacao] = useState('')

  // Estado para exibir mensagem temporária de sucesso após o registro ser concluído
  const [mensagemSucesso, setMensagemSucesso] = useState('')

  // Estado para armazenar a lista dinâmica de registros de andamento (mais recentes primeiro)
  const [registros, setRegistros] = useState(() => {
    // Se a obra possuir histórico prévio na timeline, inicializa com esses dados convertidos
    if (obra?.timeline && Array.isArray(obra.timeline)) {
      // Inverte para colocar os mais recentes no topo da lista
      return [...obra.timeline].reverse().map((item, index) => ({
        // Identificador exclusivo fictício para cada item da timeline existente
        id: `timeline-${index}`,
        // Tipo do marco ou registro
        tipo: item.tipo,
        // Texto descritivo do andamento
        descricao: item.descricao,
        // Data formatada de ocorrência
        dataHora: item.data,
        // Nome do responsável registrado
        autor: colaboradorLogado.nome,
        // Lista de fotos vazia para registros históricos anteriores
        fotos: [],
      }))
    }
    // Caso contrário, inicia com uma lista vazia
    return []
  })

  // Efeito de limpeza para revogar URLs temporárias criadas por URL.createObjectURL e evitar vazamento de memória
  useEffect(() => {
    // Função de limpeza executada quando o componente é desmontado
    return () => {
      // Percorre todas as fotos que possuírem URL temporária gerada
      fotosSelecionadas.forEach((foto) => {
        // Revoga a URL criada no navegador para liberar memória
        if (foto.url && foto.url.startsWith('blob:')) {
          URL.revokeObjectURL(foto.url)
        }
      })
    }
  }, [fotosSelecionadas])

  // Se a obra não existir no cadastro de obras mockadas, exibe tela amigável de erro 404
  if (!obra) {
    return (
      // Contêiner centralizado ocupando a tela inteira com fundo suave
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 text-ink">
        {/* Cartão de aviso de erro */}
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          {/* Ícone de alerta em círculo vermelho claro */}
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-600 text-2xl" aria-hidden="true">
            ⚠
          </div>
          {/* Título de obra não encontrada */}
          <h1 className="text-xl sm:text-2xl font-bold text-navy mb-2">
            Obra não encontrada
          </h1>
          {/* Mensagem detalhando o identificador buscado */}
          <p className="text-sm text-slate-500 mb-6">
            Não foi possível localizar nenhuma obra cadastrada com o código <code className="font-mono font-bold text-primary bg-slate-100 px-1.5 py-0.5 rounded">#{id}</code>.
          </p>
          {/* Botão para retornar ao painel do colaborador */}
          <Button
            variant="primary"
            onClick={() => navigate('/colaborador')}
            className="w-full"
            icon="←"
          >
            Voltar para: Minhas Obras
          </Button>
        </div>
      </div>
    )
  }

  // Verifica se a obra encontrada está de fato atribuída ao colaborador fake de ID 1
  const estaAtribuida = Boolean(
    // Critério 1: o ID 1 está presente no array de colaboradores da obra
    (obra.colaboradores && obra.colaboradores.includes(idColaboradorLogado)) ||
    // Critério 2: o ID da obra está presente nas obras atribuídas do colaborador
    (colaboradorLogado.obrasAtribuidas && colaboradorLogado.obrasAtribuidas.includes(obra.id))
  )

  // Se a obra NÃO estiver atribuída a este colaborador, exibe aviso amigável de restrição de acesso
  if (!estaAtribuida) {
    return (
      // Contêiner centralizado ocupando a tela inteira
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 text-ink">
        {/* Cartão de bloqueio de visualização */}
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          {/* Ícone de cadeado em círculo amarelo */}
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-600 text-2xl" aria-hidden="true">
            🔒
          </div>
          {/* Título informando que a obra não está atribuída */}
          <h1 className="text-xl sm:text-2xl font-bold text-navy mb-2">
            Obra não atribuída
          </h1>
          {/* Explicação amigável de que o colaborador só acessa suas próprias obras */}
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Esta obra não está atribuída à sua equipe ({colaboradorLogado.nome}). Você só possui permissão para registrar andamento nas obras em que está diretamente alocado.
          </p>
          {/* Botão para retornar com segurança à listagem de obras do colaborador */}
          <Button
            variant="primary"
            onClick={() => navigate('/colaborador')}
            className="w-full"
            icon="←"
          >
            Voltar para: Minhas Obras
          </Button>
        </div>
      </div>
    )
  }

  // Obtém o esquema de cores visuais condizente com o status da obra
  const coresStatus = obterCoresStatus(obra.status)

  // Função disparada quando o usuário seleciona arquivos de foto pelo input file
  function handleSelecionarFotos(event) {
    // Converte a lista de arquivos selecionados em um array nativo do JavaScript
    const arquivos = Array.from(event.target.files || [])
    // Se nenhum arquivo foi selecionado, não realiza nenhuma ação
    if (arquivos.length === 0) return

    // Mapeia os arquivos criando um objeto com nome e uma URL temporária de visualização
    const novasFotos = arquivos.map((arquivo) => ({
      // Identificador exclusivo aleatório para cada foto selecionada
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      // Nome original do arquivo da imagem
      nome: arquivo.name,
      // Criação da URL local no navegador usando URL.createObjectURL para pré-visualização instantânea
      url: URL.createObjectURL(arquivo),
    }))

    // Acrescenta as novas fotos à lista de fotos já selecionadas
    setFotosSelecionadas((anteriores) => [...anteriores, ...novasFotos])

    // Limpa o valor do input para permitir selecionar o mesmo arquivo novamente se o usuário quiser
    event.target.value = ''
  }

  // Função para remover uma foto selecionada antes de submeter o formulário
  function handleRemoverFoto(idFoto) {
    // Localiza a foto a ser removida para liberar sua URL temporária
    const fotoParaRemover = fotosSelecionadas.find((f) => f.id === idFoto)
    // Se a foto tiver URL criada com blob, revoga a URL no navegador
    if (fotoParaRemover?.url && fotoParaRemover.url.startsWith('blob:')) {
      URL.revokeObjectURL(fotoParaRemover.url)
    }
    // Filtra o array removendo a foto cujo ID coincide com o selecionado
    setFotosSelecionadas((anteriores) => anteriores.filter((f) => f.id !== idFoto))
  }

  // Função disparada no envio do formulário para registrar o andamento
  function handleRegistrarAndamento(event) {
    // Evita o recarregamento automático da página ao submeter o formulário
    event.preventDefault()

    // Remove espaços em branco do início e do final do texto digitado
    const textoLimpo = textoDescricao.trim()

    // Validação obrigatória: verifica se o texto está vazio
    if (!textoLimpo) {
      // Define a mensagem de erro informativa para o usuário
      setErroValidacao('Por favor, informe a descrição do andamento antes de registrar.')
      // Interrompe o processo de registro
      return
    }

    // Limpa eventuais mensagens de erro anteriores
    setErroValidacao('')

    // Formata a data e hora atual no padrão brasileiro (ex.: "11/11/2026, 14:35")
    const dataHoraAtual = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    // Cria o novo objeto de registro com os dados informados
    const novoRegistro = {
      // Identificador único numérico gerado pelo timestamp atual
      id: Date.now(),
      // Tipo do registro escolhido (Anotação, Atualização de andamento ou Ocorrência)
      tipo: tipoRegistro,
      // Texto da anotação/descrição informado
      descricao: textoLimpo,
      // Nome do colaborador logado
      autor: colaboradorLogado.nome,
      // Data e hora em que o registro foi realizado
      dataHora: dataHoraAtual,
      // Lista com as URLs das fotos anexadas
      fotos: fotosSelecionadas.map((f) => f.url),
    }

    // Adiciona o novo registro no início da lista (mais recentes primeiro)
    setRegistros((anteriores) => [novoRegistro, ...anteriores])

    // Limpa o campo de texto do formulário
    setTextoDescricao('')

    // Reseta a lista de fotos selecionadas
    setFotosSelecionadas([])

    // Exibe aviso visual de sucesso
    setMensagemSucesso('Andamento registrado com sucesso!')

    // Programa a limpeza automática da mensagem de sucesso após 4 segundos
    setTimeout(() => {
      setMensagemSucesso('')
    }, 4000)
  }

  // Renderização da interface da página de Registro de Andamento
  return (
    // Contêiner principal com fundo suave e altura mínima de 100vh
    <div className="min-h-screen bg-background text-ink">

      {/* Barra de cabeçalho fixa no topo com navegação */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        {/* Contêiner interno limitado e alinhado */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">

          {/* Botão voltar para a listagem de obras do colaborador */}
          <Button
            variant="outline"
            onClick={() => navigate('/colaborador')}
            className="text-xs py-1.5 px-3"
          >
            ← Voltar
          </Button>

          {/* Trilha de navegação estrutural (breadcrumb) */}
          <nav className="text-xs text-slate-500 hidden sm:flex items-center gap-2" aria-label="Navegação estrutural">
            {/* Link para o painel de obras do colaborador */}
            <Link to="/colaborador" className="hover:text-emerald-700 transition">
              Minhas Obras
            </Link>
            {/* Separador visual */}
            <span>/</span>
            {/* Título da obra atual */}
            <span className="font-semibold text-navy truncate max-w-[200px]">
              {obra.titulo}
            </span>
            {/* Separador visual */}
            <span>/</span>
            {/* Identificador da ação atual */}
            <span className="text-emerald-700 font-semibold">
              Registrar Andamento
            </span>
          </nav>

          {/* Identificação do colaborador logado */}
          <div className="text-right">
            <span className="block text-xs font-bold text-navy">{colaboradorLogado.nome}</span>
            <small className="block text-[10px] text-emerald-700 font-semibold">{colaboradorLogado.funcao}</small>
          </div>

        </div>
      </header>

      {/* Conteúdo principal da página */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Bloco 1: Cabeçalho com título, endereço e status da obra (somente leitura, sem valores em dinheiro) */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs" aria-label="Dados da obra">
          {/* Linha superior com etiqueta e badge de status */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            {/* Etiqueta de identificação da obra */}
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Obra em Execução · Canteiro de Obras
            </span>
            {/* Badge com o status atual da obra (somente leitura) */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${coresStatus.bg} ${coresStatus.texto}`}>
              <span className={`w-2 h-2 rounded-full ${coresStatus.ponto}`}></span>
              {obra.status}
            </span>
          </div>

          {/* Título principal da obra */}
          <h1 className="text-2xl sm:text-3xl font-bold text-navy mb-2">
            {obra.titulo}
          </h1>

          {/* Endereço completo do canteiro */}
          <div className="flex items-start gap-2 text-sm text-slate-600 mb-2">
            {/* Ícone de localização */}
            <span className="text-slate-400 mt-0.5 text-base" aria-hidden="true">📍</span>
            {/* Endereço da obra */}
            <span>{obra.endereco}</span>
          </div>

          {/* Prazo estimado de conclusão (sem nenhuma menção a valores monetários) */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {/* Ícone de calendário */}
            <span aria-hidden="true">📅</span>
            {/* Prazo previsto */}
            <span>Previsão de entrega: <strong className="text-slate-700">{obra.prazo}</strong></span>
          </div>
        </section>

        {/* Bloco 2: Formulário para registrar novo andamento */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs" aria-label="Formulário de andamento">
          {/* Título do formulário */}
          <div className="mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-navy">
              Registrar Andamento no Canteiro
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Registre atualizações de progresso físico, ocorrências no canteiro ou anotações técnicas do dia.
            </p>
          </div>

          {/* Alerta de sucesso caso um novo registro tenha sido adicionado */}
          {mensagemSucesso && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 font-medium flex items-center gap-2" role="status">
              <span>✓</span>
              <span>{mensagemSucesso}</span>
            </div>
          )}

          {/* Alerta de erro de validação (ex: texto vazio) */}
          {erroValidacao && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 font-medium flex items-center gap-2" role="alert">
              <span>⚠</span>
              <span>{erroValidacao}</span>
            </div>
          )}

          {/* Formulário com manipulador de envio */}
          <form onSubmit={handleRegistrarAndamento} noValidate className="space-y-4">

            {/* Campo 1: Seleção do tipo de registro */}
            <div>
              <label htmlFor="tipo-registro" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tipo de Registro
              </label>
              {/* Seletor com as 3 opções solicitadas */}
              <select
                id="tipo-registro"
                value={tipoRegistro}
                onChange={(e) => setTipoRegistro(e.target.value)}
                className="w-full sm:w-72 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value="Atualização de andamento">Atualização de andamento</option>
                <option value="Anotação">Anotação</option>
                <option value="Ocorrência">Ocorrência</option>
              </select>
            </div>

            {/* Campo 2: Descrição textual do andamento */}
            <div>
              <label htmlFor="descricao-registro" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Descrição do Andamento <span className="text-red-500">*</span>
              </label>
              {/* Textarea para detalhamento das atividades */}
              <textarea
                id="descricao-registro"
                rows={4}
                value={textoDescricao}
                onChange={(e) => {
                  setTextoDescricao(e.target.value)
                  if (erroValidacao) setErroValidacao('')
                }}
                placeholder="Exemplo: Concretagem das sapatas concluída no bloco A. Aguardando período de cura para prosseguir com a alvenaria..."
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-800 shadow-xs placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* Campo 3: Escolha de fotos com pré-visualização (URL.createObjectURL) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Fotos do Canteiro (opcional)
              </label>
              {/* Input de arquivo para fotos */}
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition shadow-xs">
                  <span>📷</span>
                  <span>Adicionar Fotos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleSelecionarFotos}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-slate-500">
                  {fotosSelecionadas.length > 0
                    ? `${fotosSelecionadas.length} foto(s) anexada(s)`
                    : 'Formatos suportados: JPG, PNG, WEBP'}
                </span>
              </div>

              {/* Área de pré-visualização das fotos selecionadas */}
              {fotosSelecionadas.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {fotosSelecionadas.map((foto) => (
                    <div key={foto.id} className="relative group">
                      {/* Imagem pré-visualizada usando a URL gerada por URL.createObjectURL */}
                      <img
                        src={foto.url}
                        alt={foto.nome}
                        className="h-20 w-20 object-cover rounded-xl border border-slate-200 shadow-xs"
                      />
                      {/* Botão de remoção da foto */}
                      <button
                        type="button"
                        onClick={() => handleRemoverFoto(foto.id)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center hover:bg-red-700 shadow-sm"
                        title="Remover foto"
                        aria-label={`Remover ${foto.nome}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botão de ação para registrar o andamento */}
            <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
              {/* Botão primário para submeter o formulário */}
              <Button
                variant="compact"
                type="submit"
                className="bg-emerald-700 hover:bg-emerald-800 text-xs py-2 px-4"
              >
                Registrar Andamento
              </Button>

              {/* Botão secundário de retorno */}
              <Button
                variant="outline"
                type="button"
                onClick={() => navigate('/colaborador')}
                className="text-xs py-1.5 px-3"
              >
                Voltar para Minhas Obras
              </Button>
            </div>

          </form>
        </section>

        {/* Bloco 3: Lista de registros realizados (mais recentes primeiro) */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs" aria-label="Histórico de registros">
          {/* Cabeçalho da seção de histórico */}
          <div className="flex items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-navy">
                Histórico de Andamentos e Ocorrências
              </h2>
              <p className="text-xs text-slate-500">
                Registros ordenados cronologicamente (mais recentes primeiro).
              </p>
            </div>
            {/* Totalizador de registros */}
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
              {registros.length} registro(s)
            </span>
          </div>

          {/* Exibição condicional da lista de registros */}
          {registros.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center italic">
              Nenhum andamento registrado ainda para esta obra.
            </p>
          ) : (
            <div className="space-y-4">
              {registros.map((reg) => {
                // Define estilos visuais da badge conforme o tipo do registro
                let corBadge = 'bg-slate-100 text-slate-700'
                if (reg.tipo === 'Atualização de andamento') {
                  corBadge = 'bg-emerald-100 text-emerald-800'
                } else if (reg.tipo === 'Ocorrência') {
                  corBadge = 'bg-amber-100 text-amber-800'
                } else if (reg.tipo === 'Anotação') {
                  corBadge = 'bg-sky-100 text-sky-800'
                }

                return (
                  <article key={reg.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition hover:bg-slate-50">
                    {/* Linha superior com tipo e data/hora */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${corBadge}`}>
                        {reg.tipo}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {reg.dataHora}
                      </span>
                    </div>

                    {/* Texto da descrição do andamento */}
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line mb-3">
                      {reg.descricao}
                    </p>

                    {/* Fotos anexadas ao registro, se existirem */}
                    {reg.fotos && reg.fotos.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {reg.fotos.map((fotoUrl, idx) => (
                          <img
                            key={idx}
                            src={fotoUrl}
                            alt={`Foto ${idx + 1} do registro`}
                            className="h-16 w-16 object-cover rounded-lg border border-slate-200 shadow-xs"
                          />
                        ))}
                      </div>
                    )}

                    {/* Rodapé do registro com nome do autor */}
                    <div className="border-t border-slate-200/60 pt-2 text-[11px] text-slate-500">
                      Registrado por: <strong className="text-slate-700">{reg.autor}</strong>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

      </main>

    </div>
  )
}
