// Valida as disponibilidades semanais recebidas pelas rotas de funcionário.
function validarDisponibilidades(disponibilidades) {
  // A lista vazia remove a programação e continua sendo válida.
  if (!Array.isArray(disponibilidades)) return "Informe a programação semanal do funcionário";
  // Um funcionário pode ficar sem programação em qualquer momento.
  if (disponibilidades.length === 0) return null;

  // Guarda os dias programados para detectar repetição entre obras.
  const diasPorSemana = new Map();
  // Impede que a mesma obra apareça duas vezes no mesmo envio.
  const obrasSelecionadas = new Set();

  // Valida cada obra e registra as ocorrências de cada dia.
  for (const item of disponibilidades) {
    // Cada item precisa indicar uma obra e uma lista válida de dias.
    if (!item || typeof item.obraId !== "string" || !item.obraId.trim() || !Array.isArray(item.diasSemana) || item.diasSemana.some((dia) => !Number.isInteger(dia) || dia < 0 || dia > 6)) {
      return "Informe uma obra e dias da semana válidos";
    }
    // A mesma obra só pode aparecer uma vez no payload.
    if (obrasSelecionadas.has(item.obraId)) return "Selecione cada obra apenas uma vez";
    obrasSelecionadas.add(item.obraId);

    // Horários informados devem usar somente o formato HH:MM de 07:00 a 17:59.
    const horarioInformado = item.horarioInicio !== undefined && item.horarioInicio !== null;
    if (horarioInformado && (typeof item.horarioInicio !== "string" || !/^(0[7-9]|1[0-7]):[0-5][0-9]$/.test(item.horarioInicio))) {
      return "Informe um horário válido no formato HH:MM, entre 07:00 e 17:59";
    }

    // Dias repetidos na mesma obra não criam ocorrências extras.
    for (const dia of new Set(item.diasSemana)) {
      const ocorrencias = diasPorSemana.get(dia) || [];
      ocorrencias.push({ obraId: item.obraId, horarioInicio: horarioInformado ? item.horarioInicio : null });
      diasPorSemana.set(dia, ocorrencias);
    }
  }

  // Dias em mais de uma obra precisam de horário e não podem coincidir.
  for (const ocorrencias of diasPorSemana.values()) {
    if (ocorrencias.length < 2) continue;
    if (ocorrencias.some((item) => !item.horarioInicio)) {
      return "Informe o horário de início quando o mesmo dia estiver programado em mais de uma obra";
    }
    const horarios = ocorrencias.map((item) => item.horarioInicio);
    if (new Set(horarios).size !== horarios.length) {
      return "O funcionário não pode iniciar em obras diferentes no mesmo dia e horário";
    }
  }

  // Retorna nulo quando todas as regras foram atendidas.
  return null;
}

// Expõe o validador para as rotas e para testes isolados sem banco.
module.exports = { validarDisponibilidades };
