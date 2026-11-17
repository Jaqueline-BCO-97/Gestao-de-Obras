const idsAgendamentosNotificadosNaSessao = new Set()

// Cada montagem/obra recebe seu próprio cursor para histórico e primeira leitura.
export function criarRastreadorObra(id) {
  return { id, idsConhecidos: new Set(), primeiraLeitura: true }
}

// Bloqueia respostas atrasadas após navegação para outra obra ou desmontagem.
export function consultaAindaPertenceAObra(rastreador, idAtual, ativo = true) {
  return ativo && rastreador.id === idAtual
}

// Reconecta consultando apenas quando a aba está visível; o chamador controla concorrência.
export function registrarListenerOnline(atualizar, janela = window, documento = document) {
  const aoReconectar = () => {
    if (documento.visibilityState === 'visible') atualizar()
  }
  janela.addEventListener('online', aoReconectar)
  return () => janela.removeEventListener('online', aoReconectar)
}

// Marca os eventos já conhecidos para que reconsultas e remontagens não repitam avisos.
export function registrarEventosConhecidos(eventos, idsConhecidos) {
  for (const evento of eventos || []) {
    const id = String(evento.id)
    idsConhecidos.add(id)
    idsAgendamentosNotificadosNaSessao.add(id)
  }
}

// Retorna apenas reagendamentos visíveis que chegaram depois da primeira leitura.
export function detectarNovosAgendamentos(eventos, idsConhecidos) {
  const novos = []
  for (const evento of eventos || []) {
    const id = String(evento.id)
    if (evento.tipo === 'agendamento' && evento.visivelParaCliente === true && !idsConhecidos.has(id) && !idsAgendamentosNotificadosNaSessao.has(id)) {
      novos.push(evento)
      idsAgendamentosNotificadosNaSessao.add(id)
    }
    idsConhecidos.add(id)
  }
  return novos
}
