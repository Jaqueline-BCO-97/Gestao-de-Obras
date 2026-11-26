// Usa o executor nativo do Node para validar o script de limpeza sem tocar no banco real.
const { describe, it } = require("node:test");
// Fornece verificações estritas sobre contagens, proteção e idempotência.
const assert = require("node:assert/strict");
// Importa o montador de plano e o executor transacional do script de limpeza.
const { montarPlanoLimpeza, executarPlanoLimpeza } = require("../scripts/limpar-dados-teste");

// Avalia operadores Prisma simples no banco simulado deste teste.
function casaValor(valor, esperado) {
  if (esperado === null) return valor === null;
  if (esperado && typeof esperado === "object" && !(esperado instanceof Date)) {
    if (esperado.in) return esperado.in.includes(valor);
    if (esperado.notIn) return !esperado.notIn.includes(valor);
    if (Object.hasOwn(esperado, "not")) return !casaValor(valor, esperado.not);
  }
  return valor === esperado;
}

// Aplica filtros simples (AND, OR e campos diretos) em uma lista em memória.
function casaFiltro(item, where = {}) {
  return Object.entries(where).every(([chave, esperado]) => {
    if (chave === "OR") return esperado.some((alt) => casaFiltro(item, alt));
    return casaValor(item[chave], esperado);
  });
}

// Cria um banco em memória com o mesmo formato dos dados reais de teste da apresentação.
function criarBancoSimulado(sobrescrita = {}) {
  const estado = {
    obras: [
      { id: "o1", empresaId: "emp-1", nome: "teste2", status: "AGENDADA", clienteId: "u2" },
      { id: "o2", empresaId: "emp-1", nome: "teste", status: "AGENDADA", clienteId: "u1" },
      { id: "o3", empresaId: "emp-1", nome: "Teste", status: "AGENDADA", clienteId: "u3" },
    ],
    usuarios: [
      { id: "u1", empresaId: "emp-1", nome: "aaaaaa", email: "a@exemplo.invalid", tipo: "CLIENTE" },
      { id: "u2", empresaId: "emp-1", nome: "Dona teste", email: "b@exemplo.invalid", tipo: "CLIENTE" },
      { id: "u3", empresaId: "emp-1", nome: "teste de cliente", email: "c@exemplo.invalid", tipo: "CLIENTE" },
      { id: "u4", empresaId: "emp-1", nome: "Alexssandra Pereira", email: "g@exemplo.invalid", tipo: "COLABORADOR" },
    ],
    funcionarios: [
      { id: "f1", empresaId: "emp-1", nome: "Alexssandra Pereira", usuarioId: "u4" },
    ],
    convites: [
      { id: "c1", empresaId: "emp-1", tipo: "CLIENTE", nome: "aaaaaa", email: "a@exemplo.invalid", obraId: "o2", usadoEm: new Date(), criadoPorId: "admin" },
      { id: "c2", empresaId: "emp-1", tipo: "CLIENTE", nome: "Dona teste", email: "b@exemplo.invalid", obraId: "o1", usadoEm: new Date(), criadoPorId: "admin" },
      { id: "c3", empresaId: "emp-1", tipo: "CLIENTE", nome: "teste de cliente", email: "c@exemplo.invalid", obraId: "o3", usadoEm: new Date(), criadoPorId: "admin" },
      { id: "c4", empresaId: "emp-1", tipo: "GERENTE", nome: "Anderson Ferreiro", email: "g2@exemplo.invalid", obraId: "o1", usadoEm: null, criadoPorId: "admin" },
    ],
    escalas: [
      // Inclui a escala já encerrada da gerente na obra teste.
      { id: "e1", obraId: "o2", funcionarioId: "f1", dataFim: new Date(), alteradoPorId: "admin" },
    ],
    disponibilidades: [],
    parcelas: [
      { id: "p1", obraId: "o1", situacao: "PENDENTE", pagaEm: null },
      { id: "p2", obraId: "o2", situacao: "PENDENTE", pagaEm: null },
    ],
    pagamentos: [],
    contratos: [{ id: "ct1", obraId: "o1" }],
    aceites: [],
    eventos: [
      { id: "ev1", obraId: "o2", usuarioId: "admin", tipo: "FOTO", descricao: "Foto adicionada às informações da obra." },
      { id: "ev2", obraId: "o2", usuarioId: "u1", tipo: "STATUS", descricao: "aaaaaa aceitou o convite de cliente e vinculou-se à obra." },
    ],
    notificacoes: [
      { id: "n1", obraId: "o2", usuarioId: "u1" },
      { id: "n2", obraId: null, usuarioId: "u4" },
    ],
    ...sobrescrita,
  };

  // Monta os métodos mínimos de consulta, contagem e remoção do Prisma.
  const api = {
    obra: {
      findMany: async ({ where }) => estado.obras.filter((item) => casaFiltro(item, where)),
      count: async ({ where }) => estado.obras.filter((item) => casaFiltro(item, where)).length,
      deleteMany: async ({ where }) => remover(estado.obras, where),
    },
    usuario: {
      findMany: async ({ where }) => estado.usuarios.filter((item) => casaFiltro(item, where)),
      deleteMany: async ({ where }) => remover(estado.usuarios, where),
    },
    funcionario: {
      findMany: async ({ where }) => estado.funcionarios.filter((item) => casaFiltro(item, where)),
      count: async ({ where }) => estado.funcionarios.filter((item) => casaFiltro(item, where)).length,
      deleteMany: async ({ where }) => remover(estado.funcionarios, where),
    },
    convite: {
      findMany: async ({ where }) => estado.convites.filter((item) => casaFiltro(item, where)),
      findFirst: async ({ where }) => estado.convites.find((item) => casaFiltro(item, where)) || null,
      count: async ({ where }) => estado.convites.filter((item) => casaFiltro(item, where)).length,
      deleteMany: async ({ where }) => remover(estado.convites, where),
      updateMany: async ({ where, data }) => {
        const alvos = estado.convites.filter((item) => casaFiltro(item, where));
        alvos.forEach((item) => Object.assign(item, data));
        return { count: alvos.length };
      },
    },
    obraEscala: {
      count: async ({ where }) => estado.escalas.filter((item) => casaFiltro(item, where)).length,
      deleteMany: async ({ where }) => remover(estado.escalas, where),
    },
    disponibilidadeFuncionario: {
      count: async ({ where }) => estado.disponibilidades.filter((item) => casaFiltro(item, where)).length,
      deleteMany: async ({ where }) => remover(estado.disponibilidades, where),
    },
    parcela: {
      count: async ({ where }) => estado.parcelas.filter((item) => casaFiltro(item, where)).length,
      deleteMany: async ({ where }) => remover(estado.parcelas, where),
    },
    pagamento: {
      count: async ({ where }) => estado.pagamentos.filter((item) => casaFiltro(item, where)).length,
      deleteMany: async ({ where }) => remover(estado.pagamentos, where),
    },
    contrato: {
      count: async ({ where }) => estado.contratos.filter((item) => casaFiltro(item, where)).length,
      deleteMany: async ({ where }) => remover(estado.contratos, where),
    },
    contratoAceite: {
      count: async ({ where }) => estado.aceites.filter((item) => casaFiltro(item, where)).length,
    },
    obraEvento: {
      findMany: async ({ where }) => estado.eventos.filter((item) => casaFiltro(item, where)),
      count: async ({ where }) => estado.eventos.filter((item) => casaFiltro(item, where)).length,
      deleteMany: async ({ where }) => remover(estado.eventos, where),
    },
    notificacao: {
      count: async ({ where }) => estado.notificacoes.filter((item) => casaFiltro(item, where)).length,
      deleteMany: async ({ where }) => remover(estado.notificacoes, where),
    },
    $transaction: async (cb) => cb(api),
  };

  return { estado, prisma: api };
}

function remover(lista, where) {
  const antes = lista.length;
  const restantes = lista.filter((item) => !casaFiltro(item, where));
  lista.splice(0, lista.length, ...restantes);
  return { count: antes - lista.length };
}

describe("Script de limpeza dos dados de teste", () => {
  it("monta contagens exatas no dry-run e apaga em transação com idempotência", async () => {
    const { estado, prisma } = criarBancoSimulado();
    // Confirma que o dry-run não altera nenhum registro.
    const plano = await montarPlanoLimpeza(prisma);
    assert.equal(plano.contagens.Obra, 3);
    assert.equal(plano.contagens.UsuarioCliente, 3);
    assert.equal(plano.contagens.Funcionario, 1);
    assert.equal(plano.contagens.UsuarioGerente, 1);
    assert.equal(plano.contagens.ConviteExcluido, 1);
    assert.equal(estado.obras.length, 3);

    // Executa a limpeza transacional e verifica que todos os alvos saíram.
    const execucao1 = await executarPlanoLimpeza(prisma, plano);
    assert.equal(execucao1.removido, true);
    assert.equal(estado.obras.length, 0);
    assert.equal(estado.usuarios.length, 0);
    assert.equal(estado.funcionarios.length, 0);
    assert.equal(estado.escalas.length, 0);
    assert.equal(estado.convites.filter((c) => c.usadoEm === null).length, 0);

    // Reexecuta de forma idempotente e confirma contagem zerada sem erro.
    const plano2 = await montarPlanoLimpeza(prisma);
    const execucao2 = await executarPlanoLimpeza(prisma, plano2);
    assert.equal(execucao2.removido, false);
    assert.equal(plano2.contagens.Obra, 0);
  });

  it("aborta quando um gerente possui evento em outra obra ou há duplicidade de nome", async () => {
    // Caso 1: gerente com evento fora das obras autorizadas.
    const gerenteOutraObra = criarBancoSimulado({
      eventos: [{ id: "ev-outro", obraId: "obra-producao", usuarioId: "u4", tipo: "ANOTACAO", descricao: "Nota" }],
    });
    await assert.rejects(montarPlanoLimpeza(gerenteOutraObra.prisma), /outras obras/i);

    // Caso 2: dois registros com o mesmo nome exato.
    const duplicado = criarBancoSimulado({
      obras: [
        { id: "o1", empresaId: "emp-1", nome: "teste", status: "AGENDADA", clienteId: "u1" },
        { id: "o2", empresaId: "emp-1", nome: "teste", status: "AGENDADA", clienteId: "u1" },
      ],
    });
    await assert.rejects(montarPlanoLimpeza(duplicado.prisma), /2 registros/);
  });

  it("preserva conta do cliente quando não tiver origem em convite", async () => {
    const { estado, prisma } = criarBancoSimulado({ convites: [] });
    const plano = await montarPlanoLimpeza(prisma);
    assert.equal(plano.contagens.UsuarioCliente, 0);
    assert.equal(plano.alvos.clientesPreservados.length, 3);
    await executarPlanoLimpeza(prisma, plano);
    assert.equal(estado.obras.length, 0);
    assert.equal(estado.usuarios.filter((u) => u.tipo === "CLIENTE").length, 3);
  });
});
