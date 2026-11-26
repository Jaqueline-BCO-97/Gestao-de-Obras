// Cria o estado inicial dos dias e horários de uma obra selecionada.
export function programacaoVazia() {
  // Dias e horário começam vazios para que a programação seja opcional.
  return { diasSemana: [], hora: '', minuto: '' }
}

// Converte uma hora existente da API para os dois campos da interface.
export function separarHorarioInicio(horarioInicio) {
  // Mantém campos vazios para dados antigos sem horário salvo.
  if (typeof horarioInicio !== 'string' || !/^\d{2}:\d{2}$/.test(horarioInicio)) return { hora: '', minuto: '' }
  // Separa HH:MM para preencher as listas nativas.
  const [hora, minuto] = horarioInicio.split(':')
  // Devolve os valores exatamente como a API os armazenou.
  return { hora, minuto }
}

// Valida e converte a programação da tela para o payload da API.
export function prepararProgramacaoFuncionario(programacao) {
  // Cada obra vira um item com os dias e seu horário local.
  const disponibilidades = Object.entries(programacao).map(([obraId, item]) => ({
    // Mantém o identificador da obra usado pelas rotas atuais.
    obraId,
    // Deduplica dias sem alterar a ordem em que foram escolhidos.
    diasSemana: [...new Set(item.diasSemana)],
    // Envia horário completo ou nulo quando ambos os campos estão vazios.
    horarioInicio: item.hora && item.minuto ? `${item.hora}:${item.minuto}` : null,
  }))

  // Não permite enviar somente a hora ou somente o minuto.
  const camposParciais = Object.values(programacao).some((item) => Boolean(item.hora) !== Boolean(item.minuto))
  if (camposParciais) return { disponibilidades: [], erro: 'Selecione hora e minuto juntos, ou deixe os dois campos vazios.' }

  // Conta em quantas obras cada dia da semana foi selecionado.
  const ocorrenciasPorDia = new Map()
  for (const item of disponibilidades) {
    for (const dia of item.diasSemana) {
      const ocorrencias = ocorrenciasPorDia.get(dia) || []
      ocorrencias.push(item)
      ocorrenciasPorDia.set(dia, ocorrencias)
    }
  }

  // Exige horário em cada obra quando o mesmo dia aparece mais de uma vez.
  for (const ocorrencias of ocorrenciasPorDia.values()) {
    if (ocorrencias.length > 1 && ocorrencias.some((item) => !item.horarioInicio)) {
      return { disponibilidades: [], erro: 'Informe o horário de início quando o mesmo dia estiver programado em mais de uma obra.' }
    }
    // Impede somente horários exatamente iguais no mesmo dia entre obras.
    const horarios = ocorrencias.map((item) => item.horarioInicio).filter(Boolean)
    if (new Set(horarios).size !== horarios.length) {
      return { disponibilidades: [], erro: 'O funcionário não pode iniciar em obras diferentes no mesmo dia e horário.' }
    }
  }

  // Devolve o payload quando a programação pode ser enviada ao backend.
  return { disponibilidades, erro: '' }
}
