import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import { buscarUsuarioAtual, encerrarSessao, listarObras } from '../services/auth.js'

function mensagemErroObras(erro) {
  if (erro.status === 401) return 'Sua sessão expirou. Entre novamente para consultar suas obras.'
  if (erro.status === 403) return 'Sua conta não tem permissão para consultar as obras.'
  if (erro.status === 503) return 'O serviço está temporariamente indisponível. Tente novamente em instantes.'
  return erro.message || 'Não foi possível carregar suas obras.'
}

function coresStatus(status = '') {
  if (status === 'Em andamento') return { borda: 'border-amber-500', badge: 'border-amber-200 bg-amber-50 text-amber-800', ponto: 'bg-amber-500' }
  if (status === 'Agendada') return { borda: 'border-sky-500', badge: 'border-sky-200 bg-sky-50 text-sky-800', ponto: 'bg-sky-500' }
  if (status === 'Concluída' || status === 'Aguardando conferência') return { borda: 'border-purple-500', badge: 'border-purple-200 bg-purple-50 text-purple-800', ponto: 'bg-purple-500' }
  return { borda: 'border-slate-300', badge: 'border-slate-200 bg-slate-50 text-slate-700', ponto: 'bg-slate-400' }
}

export default function Colaborador() {
  const navigate = useNavigate()
  const [obras, setObras] = useState([])
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [avisoCanteiro, setAvisoCanteiro] = useState(null)
  const [tentativas, setTentativas] = useState(0)

  useEffect(() => {
    let ativo = true
    Promise.all([listarObras(), buscarUsuarioAtual()])
      .then(([obrasApi, usuarioApi]) => {
        if (!ativo) return
        setObras(Array.isArray(obrasApi) ? obrasApi : [])
        setUsuario(usuarioApi)
        setErro('')
      })
      .catch((falha) => {
        if (!ativo) return
        setErro({ mensagem: mensagemErroObras(falha), status: falha.status })
        setObras([])
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => { ativo = false }
  }, [tentativas])

  const obrasEmAndamento = obras.filter((obra) => obra.status === 'Em andamento').length
  const obrasAgendadas = obras.filter((obra) => obra.status === 'Agendada').length
  const obrasFinalizadas = obras.filter((obra) => ['Aguardando conferência', 'Concluída'].includes(obra.status)).length

  function handleLogout() {
    encerrarSessao()
    navigate('/login')
  }

  function handleVerCanteiro(obra) {
    setAvisoCanteiro({
      id: obra.id,
      titulo: obra.titulo,
      endereco: obra.endereco,
      status: obra.status,
      prazo: obra.prazo,
      ultimaEtapa: obra.timeline?.[obra.timeline.length - 1]?.descricao || 'Nenhuma etapa registrada ainda.',
    })
  }

  return (
    <div className="min-h-screen bg-background text-ink">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600 text-white text-lg font-bold" aria-hidden="true">🔨</span>
            <div>
              <strong className="block text-base leading-tight font-bold text-navy">Obra<span className="text-primary">Master</span></strong>
              <small className="block text-[10px] tracking-wider text-emerald-700 uppercase font-bold">Painel do Gerente de Obra</small>
            </div>
          </div>
          <nav className="flex items-center flex-wrap gap-2 text-xs font-semibold" aria-label="Navegação do colaborador">
            <Link to="/colaborador" className="py-1.5 px-3 rounded-md bg-emerald-700 text-white">Minhas Obras</Link>
            <Link to="/perfil" className="py-1.5 px-3 rounded-md text-slate-600 hover:text-primary hover:bg-slate-100">Perfil</Link>
            <Button variant="outline" onClick={handleLogout} className="text-xs py-1.5 px-3">Sair</Button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-base border border-emerald-200 shrink-0" aria-hidden="true">
              {usuario?.nome?.split(/\s+/).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase() || '…'}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-navy">{usuario?.nome || 'Gerente de obra'}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{usuario?.funcionario?.funcao && <>Função: <strong className="text-emerald-700">{usuario.funcionario.funcao}</strong> · </>}{usuario?.telefone || usuario?.funcionario?.telefone ? `Telefone: ${usuario.telefone || usuario.funcionario.telefone} · ` : ''}{usuario?.email || 'Dados carregados da sua sessão autenticada'}</p>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 self-start sm:self-auto">
            <span className="block font-semibold text-slate-700">🔒 Acesso Operacional</span>
            <span className="text-[11px] text-slate-500">A API libera somente obras com alocação ativa.</span>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">Meu Canteiro de Obras</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy">Obras sob Minha Responsabilidade</h1>
          <p className="mt-1 text-sm text-slate-500">Acompanhe localização, cronograma e status das obras em que você está alocado.</p>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" aria-label="Métricas do gerente de obra">
          <Card label="Obras Atribuídas" value={obras.length} accent="border-emerald-600" />
          <Card label="Em Andamento" value={obrasEmAndamento} accent="border-amber-500" />
          <Card label="Agendadas" value={obrasAgendadas} accent="border-sky-500" />
          <Card label="Finalizadas / Vistoria" value={obrasFinalizadas} accent="border-purple-500" />
        </section>

        {avisoCanteiro && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-900 shadow-xs">
            <div className="text-xs sm:text-sm">
              <p className="font-bold">📍 Obra #{avisoCanteiro.id}: {avisoCanteiro.titulo}</p>
              <p className="mt-1">Local: <strong>{avisoCanteiro.endereco || 'Endereço não informado'}</strong></p>
              <p className="mt-0.5">Status: <strong>{avisoCanteiro.status}</strong> • Prazo: <strong>{avisoCanteiro.prazo || 'Não informado'}</strong></p>
              <p className="mt-1 text-slate-600">Último registro: {avisoCanteiro.ultimaEtapa}</p>
            </div>
            <Button variant="outline" onClick={() => setAvisoCanteiro(null)} className="text-xs py-1 px-3 self-end sm:self-auto">Fechar detalhes</Button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-navy">Obras Atribuídas{!carregando && !erro ? ` (${obras.length})` : ''}</h2>
          <span className="text-xs text-slate-500">Dados fornecidos pela API autenticada</span>
        </div>

        {carregando && <p className="rounded-xl bg-white border border-slate-200 p-6 text-sm text-slate-600" role="status">Carregando suas obras…</p>}
        {!carregando && erro && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">
            <p>{erro.mensagem}</p>
            {![401, 403].includes(erro.status) && <Button variant="outline" className="mt-3" onClick={() => { setCarregando(true); setTentativas((valor) => valor + 1) }}>Tentar novamente</Button>}
          </div>
        )}
        {!carregando && !erro && obras.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">Nenhuma obra com alocação ativa foi retornada para sua conta.</p>
        )}

        {!carregando && !erro && obras.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6" aria-label="Obras do gerente de obra">
            {obras.map((obra) => {
              const cores = coresStatus(obra.status)
              const eventos = obra.timeline || []
              const rotulos = { anotacao: 'Anotação', atualizacao: 'Atualização', ocorrencia: 'Ocorrência', status: 'Status', agendamento: 'Agendamento' }
              return (
                <Card key={obra.id} accent={cores.borda} className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-navy leading-snug">{obra.titulo}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Cliente: <strong className="text-slate-700">{obra.cliente || 'Não informado'}</strong></p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cores.badge}`}>
                        <span className={`w-2 h-2 rounded-full ${cores.ponto}`} aria-hidden="true" />{obra.status}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-xs text-slate-600">
                      <p>📍 <strong>Endereço:</strong> {obra.endereco || 'Não informado'}</p>
                      <p>📅 <strong>Prazo previsto:</strong> {obra.prazo || 'Não informado'}</p>
                    </div>
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
                  <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-400">🏗️ Canteiro ativo</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => handleVerCanteiro(obra)} className="text-xs py-1.5 px-3">Ver Canteiro</Button>
                      <Button variant="compact" onClick={() => navigate(`/colaborador/obra/${encodeURIComponent(obra.id)}`)} className="text-xs py-1.5 px-3" icon="→">Gerenciar obra</Button>
                    </div>
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
