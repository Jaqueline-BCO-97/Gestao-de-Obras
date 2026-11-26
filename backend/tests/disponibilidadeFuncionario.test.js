// Usa o executor integrado ao Node para testar regras sem banco de dados.
const { describe, it } = require("node:test");
// Usa verificações estritas para comparar erros e casos aceitos.
const assert = require("node:assert/strict");
// Importa a validação usada pelas rotas de criação e edição.
const { validarDisponibilidades } = require("../src/utils/disponibilidadeFuncionario");

// Agrupa os cenários das regras semanais por funcionário.
describe("Validação de disponibilidade semanal do funcionário", () => {
  // Permite remover toda a escala ou deixar somente um dia.
  it("permite programação vazia e programação com um único dia", () => {
    // Nenhuma obra programada é um estado válido.
    assert.equal(validarDisponibilidades([]), null);
    // Uma obra com um único dia não exige horário.
    assert.equal(validarDisponibilidades([{ obraId: "obra-a", diasSemana: [2] }]), null);
    // Uma obra sem dias também é aceita para remover sua programação.
    assert.equal(validarDisponibilidades([{ obraId: "obra-a", diasSemana: [] }]), null);
  });

  // Permite o mesmo dia em obras distintas quando os horários diferem.
  it("permite o mesmo dia em obras diferentes com horários distintos", () => {
    // Cada ocorrência tem hora de início em HH:MM.
    const itens = [
      { obraId: "obra-a", diasSemana: [1], horarioInicio: "07:00" },
      { obraId: "obra-b", diasSemana: [1], horarioInicio: "08:30" },
    ];
    // Horários diferentes não são conflito.
    assert.equal(validarDisponibilidades(itens), null);
  });

  // Exige hora quando o mesmo dia aparece em mais de uma obra.
  it("exige horário para dias repetidos entre obras", () => {
    // A falta de horário impede confirmar as duas escalas.
    const itens = [
      { obraId: "obra-a", diasSemana: [1], horarioInicio: "07:00" },
      { obraId: "obra-b", diasSemana: [1] },
    ];
    // A mensagem indica qual dado precisa ser preenchido.
    assert.match(validarDisponibilidades(itens), /Informe o horário de início/i);
  });

  // Bloqueia somente horários de início exatamente iguais no mesmo dia.
  it("bloqueia o mesmo dia e horário exato em obras diferentes", () => {
    // As duas obras começam no mesmo minuto do mesmo dia semanal.
    const itens = [
      { obraId: "obra-a", diasSemana: [4], horarioInicio: "09:15" },
      { obraId: "obra-b", diasSemana: [4], horarioInicio: "09:15" },
    ];
    // O validador devolve erro claro de conflito.
    assert.match(validarDisponibilidades(itens), /mesmo dia e horário/i);
  });

  // Valida limites e formato numérico do horário no backend.
  it("aceita somente horas de 07 a 17 e minutos de 00 a 59", () => {
    // Os limites informados são válidos.
    assert.equal(validarDisponibilidades([{ obraId: "obra-a", diasSemana: [0], horarioInicio: "07:00" }]), null);
    assert.equal(validarDisponibilidades([{ obraId: "obra-a", diasSemana: [0], horarioInicio: "17:59" }]), null);
    // Horários fora da faixa ou com caracteres não numéricos são rejeitados.
    for (const horarioInicio of ["06:59", "18:00", "07:60", "7:00", "07:AA", " 07:00"]) {
      assert.match(validarDisponibilidades([{ obraId: "obra-a", diasSemana: [0], horarioInicio }]), /HH:MM/i);
    }
  });
});
