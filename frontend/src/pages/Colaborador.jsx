// Importa os hooks useEffect e useState do React para carregar e armazenar os dados da tela.
import { useEffect, useState } from 'react'
// Importa o hook useNavigate do React Router para abrir a obra selecionada.
import { useNavigate } from 'react-router-dom'
// Importa o componente de cartão reutilizável do sistema.
import Card from '../components/Card.jsx'
// Importa o componente de botão reutilizável do sistema.
import Button from '../components/Button.jsx'
// Importa o componente de foto/iniciais do usuário.
import Avatar from '../components/Avatar.jsx'
// Importa as funções de API que buscam os dados do usuário logado e suas obras alocadas.
import { buscarUsuarioAtual, listarObras } from '../services/auth.js'
// Importa a função que resolve a foto de perfil do usuário.
import { obterFotoPerfil } from '../utils/fotoPerfil.js'

// Traduz códigos HTTP de falha para mensagens amigáveis em português.
function mensagemErroObras(erro) {
  // Sessão expirada ou token inválido.
  if (erro.status === 401) return 'Sua sessão expirou. Entre novamente para consultar suas obras.'
  // Perfil sem permissão para acessar obras.
  if (erro.status === 403) return 'Sua conta não tem permissão para consultar as obras.'
  // API ou banco temporariamente indisponíveis.
  if (erro.status === 503) return 'O serviço está temporariamente indisponível. Tente novamente em instantes.'
  // Mensagem retornada pelo servidor ou texto genérico.
  return erro.message || 'Não foi possível carregar suas obras.'
}

// Define as classes de cores existentes para borda, badge e ponto indicador do status.
function coresStatus(status = '') {
  // Obra em execução.
  if (status === 'Em andamento') return { borda: 'border-amber-500', badge: 'border-amber-200 bg-amber-50 text-amber-800', ponto: 'bg-amber-500' }
  // Obra agendada para início futuro.
  if (status === 'Agendada') return { borda: 'border-sky-500', badge: 'border-sky-200 bg-sky-50 text-sky-800', ponto: 'bg-sky-500' }
  // Obra em vistoria ou já finalizada.
  if (status === 'Concluída' || status === 'Aguardando conferência') return { borda: 'border-purple-500', badge: 'border-purple-200 bg-purple-50 text-purple-800', ponto: 'bg-purple-500' }
  // Estado padrão caso apareça algum status inesperado.
  return { borda: 'border-slate-300', badge: 'border-slate-200 bg-slate-50 text-slate-700', ponto: 'bg-slate-400' }
}

// Componente principal do painel do gerente de obra (/colaborador).
export default function Colaborador() {
  // Inicializa o navegador de rotas do React Router.
  const navigate = useNavigate()
  // Lista de obras com escala ativa retornadas pela API para o gerente.
  const [obras, setObras] = useState([])
  // Dados completos do gerente autenticado.
  const [usuario, setUsuario] = useState(null)
  // Indica se a tela ainda está aguardando resposta da API.
  const [carregando, setCarregando] = useState(true)
  // Armazena o objeto de erro caso a requisição falhe.
  const [erro, setErro] = useState('')
  // Contador usado pelo botão "Tentar novamente" para refazer a busca.
  const [tentativas, setTentativas] = useState(0)

  // Busca em paralelo as obras alocadas e os dados do gerente ao montar ou tentar novamente.
  useEffect(() => {
    // Flag de segurança para evitar atualizar estado se o componente sair da tela.
    let ativo = true
    // Dispara as duas chamadas autenticadas em paralelo.
    Promise.all([listarObras(), buscarUsuarioAtual()])
      .then(([obrasApi, usuarioApi]) => {
        // Interrompe se a tela já tiver sido desmontada.
        if (!ativo) return
        // Garante array mesmo se a resposta vier inesperada.
        setObras(Array.isArray(obrasApi) ? obrasApi : [])
        // Atualiza os dados do usuário logado.
        setUsuario(usuarioApi)
        // Limpa erro anterior.
        setErro('')
      })
      .catch((falha) => {
        // Interrompe se a tela já tiver sido desmontada.
        if (!ativo) return
        // Registra mensagem amigável e status HTTP do erro.
        setErro({ mensagem: mensagemErroObras(falha), status: falha.status })
        // Esvazia a listagem para não exibir dados inconsistentes.
        setObras([])
      })
      .finally(() => {
        // Finaliza o indicador de carregamento quando o componente ainda estiver ativo.
        if (ativo) setCarregando(false)
      })
    // Cleanup executado ao desmontar o componente.
    return () => { ativo = false }
  }, [tentativas])

  // Conta quantas obras alocadas estão em andamento.
  const obrasEmAndamento = obras.filter((obra) => obra.status === 'Em andamento').length
  // Conta quantas obras alocadas estão agendadas.
  const obrasAgendadas = obras.filter((obra) => obra.status === 'Agendada').length
  // Conta quantas obras alocadas estão em conferência ou concluídas.
  const obrasFinalizadas = obras.filter((obra) => ['Aguardando conferência', 'Concluída'].includes(obra.status)).length

  // Renderiza o painel do gerente de obras.
  return (
    <div className="min-h-screen bg-background text-ink">
      {/* Container central com largura máxima e espaçamento responsivo */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Cartão de identificação do gerente autenticado */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Avatar do gerente */}
            <Avatar nome={usuario?.nome} src={obterFotoPerfil(usuario)} className="h-20 w-20 shrink-0 border-slate-200" fallbackClassName="bg-emerald-100 text-emerald-800" />
            <div>
              {/* Nome do gerente */}
              <h2 className="text-base sm:text-lg font-bold text-navy">{usuario?.nome || 'Gerente de obra'}</h2>
              {/* Função, telefone e e-mail do gerente */}
              <p className="text-xs text-slate-500 mt-0.5">{usuario?.funcionario?.funcao && <>Função: <strong className="text-emerald-700">{usuario.funcionario.funcao}</strong> · </>}{usuario?.telefone || usuario?.funcionario?.telefone ? `Telefone: ${usuario.telefone || usuario.funcionario.telefone} · ` : ''}{usuario?.email || 'Dados carregados da sua sessão autenticada'}</p>
            </div>
          </div>
        </div>

        {/* Cabeçalho principal da listagem */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">Meu Canteiro de Obras</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy">Obras sob Minha Responsabilidade</h1>
          <p className="mt-1 text-sm text-slate-500">Acompanhe localização, cronograma e status das obras em que você está alocado.</p>
        </div>

        {/* Grade com os quatro cartões de resumo numérico */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" aria-label="Métricas do gerente de obra">
          <Card label="Obras Atribuídas" value={obras.length} accent="border-emerald-600" />
          <Card label="Em Andamento" value={obrasEmAndamento} accent="border-amber-500" />
          <Card label="Agendadas" value={obrasAgendadas} accent="border-sky-500" />
          <Card label="Finalizadas / Vistoria" value={obrasFinalizadas} accent="border-purple-500" />
        </section>

        {/* Subtítulo da seção de cartões de obra */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-navy">Obras Atribuídas{!carregando && !erro ? ` (${obras.length})` : ''}</h2>
          <span className="text-xs text-slate-500">Dados fornecidos pela API autenticada</span>
        </div>

        {/* Estado de carregamento */}
        {carregando && <p className="rounded-xl bg-white border border-slate-200 p-6 text-sm text-slate-600" role="status">Carregando suas obras…</p>}
        {/* Estado de erro com botão para nova tentativa quando aplicável */}
        {!carregando && erro && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">
            <p>{erro.mensagem}</p>
            {![401, 403].includes(erro.status) && <Button variant="outline" className="mt-3" onClick={() => { setCarregando(true); setTentativas((valor) => valor + 1) }}>Tentar novamente</Button>}
          </div>
        )}
        {/* Estado vazio quando não há escalas ativas para o gerente */}
        {!carregando && !erro && obras.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">Nenhuma obra com alocação ativa foi retornada para sua conta.</p>
        )}

        {/* Grade com os cartões de cada obra com escala ativa */}
        {!carregando && !erro && obras.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6" aria-label="Obras do gerente de obra">
            {obras.map((obra) => {
              // Calcula as cores do status atual da obra.
              const cores = coresStatus(obra.status)
              // Lê os eventos disponíveis da timeline da obra.
              const eventos = obra.timeline || []
              // Traduz os tipos de evento para exibição resumida no cartão.
              const rotulos = { anotacao: 'Anotação', atualizacao: 'Atualização', ocorrencia: 'Ocorrência', status: 'Status', agendamento: 'Agendamento' }
              // Retorna o cartão individual da obra.
              return (
                <Card key={obra.id} accent={cores.borda} className="flex flex-col justify-between">
                  <div>
                    {/* Cabeçalho do cartão com número/título da obra e selo de status */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-navy leading-snug">Obra {obra.numeroObra || obras.indexOf(obra) + 1}: {obra.titulo}</h3>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cores.badge}`}>
                        <span className={`w-2 h-2 rounded-full ${cores.ponto}`} aria-hidden="true" />{obra.status}
                      </span>
                    </div>
                    {/* Endereço e prazo previsto da obra */}
                    <div className="mt-3 space-y-2 text-xs text-slate-600">
                      <p>📍 <strong>Endereço:</strong> {obra.endereco || 'Não informado'}</p>
                      <p>📅 <strong>Prazo previsto:</strong> {obra.prazo || 'Não informado'}</p>
                    </div>
                    {/* Últimos eventos registrados quando houver histórico */}
                    {eventos.length > 0 && (
                      <div className="mt-4 bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-2">Histórico de execução física</span>
                        <div className="space-y-1.5">
                          {eventos.slice(-2).map((item) => (
                            <p key={item.id} className="leading-relaxed text-slate-600"><strong className="text-slate-700">{item.data} ({rotulos[item.tipo] || item.tipo}):</strong> {item.descricao}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Rodapé do cartão com botão primário maior levando para /colaborador/obra/:id */}
                  <div className="border-t border-slate-100 pt-3 mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-400">🏗️ Canteiro ativo</span>
                    {/* Usa a variante primária existente do Button com fonte maior (text-base) */}
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/colaborador/obra/${encodeURIComponent(obra.id)}`)}
                      className="w-full sm:w-auto text-base"
                      icon="→"
                    >
                      Gerenciar canteiro
                    </Button>
                  </div>
                </Card>
              )
            })}
          </section>
        )}
      </main>
    </div>
  )
}
