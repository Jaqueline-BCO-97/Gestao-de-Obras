// Usa o executor de testes nativo sem abrir conexão com banco compartilhado.
const { describe, it } = require("node:test");
// Fornece verificações estritas sobre respostas e estado dos registros simulados.
const assert = require("node:assert/strict");
// Importa as regras de exclusão de clientes e obras agendadas e a classificação de eventos.
const {
  eventoAutomatico,
  eventoHistoricoReal,
  excluirClienteComObrasAgendadas,
  excluirObraAgendada,
} = require("../src/services/excluirCliente");

// Compara valores simples e os operadores usados pelos filtros Prisma da regra.
function correspondeValor(valor, esperado) {
  // Compara nulos diretamente para respeitar campos opcionais.
  if (esperado === null) return valor === null;
  // Avalia os operadores de coleção e negação usados nas consultas.
  if (esperado && typeof esperado === "object" && !(esperado instanceof Date)) {
    // Confirma que o valor aparece na lista informada.
    if (esperado.in) return esperado.in.includes(valor);
    // Confirma que o valor não aparece na lista informada.
    if (esperado.notIn) return !esperado.notIn.includes(valor);
    // Compara o valor com a condição negada.
    if (Object.hasOwn(esperado, "not")) return !correspondeValor(valor, esperado.not);
    // Compara datas com o limite mínimo exclusivo.
    if (esperado.gt) return valor > esperado.gt;
    // Compara datas com o limite máximo inclusivo.
    if (esperado.lte) return valor <= esperado.lte;
  }
  // Usa igualdade estrita para os demais campos.
  return valor === esperado;
}

// Aplica filtros Prisma simples sobre as listas mantidas no teste.
function corresponde(item, where = {}) {
  // Exige que todas as condições comuns do filtro sejam satisfeitas.
  return Object.entries(where).every(([chave, esperado]) => {
    // Avalia alternativas lógicas sem ignorar outras condições do objeto.
    if (chave === "OR") return esperado.some((alternativa) => corresponde(item, alternativa));
    // Avalia condições simultâneas do filtro.
    if (chave === "AND") return esperado.every((alternativa) => corresponde(item, alternativa));
    // Compara o campo atual com seu valor ou operador esperado.
    return correspondeValor(item[chave], esperado);
  });
}

// Cria um banco em memória com transação que restaura o estado quando há falha.
function criarBanco(dados = {}) {
  // Preenche as tabelas mínimas para testar as exclusões sem dependências externas.
  const estado = {
    usuarios: [
      { id: "cliente-1", empresaId: "empresa-a", tipo: "CLIENTE", nome: "Cliente Teste", email: "cliente1@exemplo.invalid" },
    ],
    obras: [
      { id: "obra-1", empresaId: "empresa-a", clienteId: "cliente-1", nome: "Obra agendada", status: "AGENDADA", excluidaEm: null },
    ],
    parcelas: [
      { id: "parcela-1", obraId: "obra-1", situacao: "PENDENTE", pagaEm: null },
    ],
    pagamentos: [
      { id: "pagamento-1", usuarioId: "cliente-1", obraId: "obra-1", status: "CANCELADO" },
    ],
    contratos: [
      { id: "contrato-1", obraId: "obra-1" },
    ],
    aceites: [],
    eventos: [],
    convites: [
      { id: "convite-pendente", empresaId: "empresa-a", tipo: "CLIENTE", email: "outro@exemplo.invalid", obraId: "obra-1", usadoEm: null, criadoPorId: "admin-1" },
      { id: "convite-usado", empresaId: "empresa-a", tipo: "CLIENTE", email: "cliente1@exemplo.invalid", obraId: "obra-1", usadoEm: new Date("2026-01-01T00:00:00.000Z"), criadoPorId: "admin-1" },
    ],
    notificacoes: [{ id: "notificacao-1", usuarioId: "cliente-1", obraId: "obra-1" }],
    escalas: [{ id: "escala-1", obraId: "obra-1", alteradoPorId: "admin-1" }],
    disponibilidades: [{ id: "disponibilidade-1", obraId: "obra-1" }],
    funcionarios: [],
    falharAoExcluirObra: false,
    ...dados,
  };

  // Cria métodos de consulta e exclusão para cada tabela usada pelas regras.
  const tx = {
    // Busca ou remove usuários dentro do estado simulado.
    usuario: {
      findFirst: async ({ where }) => estado.usuarios.find((item) => corresponde(item, where)) || null,
      delete: async ({ where }) => {
        const indice = estado.usuarios.findIndex((item) => corresponde(item, where));
        return estado.usuarios.splice(indice, 1)[0];
      },
    },
    // Consulta e remove as obras elegíveis na empresa.
    obra: {
      findFirst: async ({ where }) => estado.obras.find((item) => corresponde(item, where)) || null,
      findMany: async ({ where }) => estado.obras.filter((item) => corresponde(item, where)),
      deleteMany: async ({ where }) => {
        if (estado.falharAoExcluirObra) throw new Error("Falha simulada ao excluir a obra");
        const antes = estado.obras.length;
        estado.obras = estado.obras.filter((item) => !corresponde(item, where));
        return { count: antes - estado.obras.length };
      },
    },
    // Consulta e remove tentativas financeiras ligadas às obras excluídas.
    pagamento: {
      findMany: async ({ where }) => estado.pagamentos.filter((item) => corresponde(item, where)),
      deleteMany: async ({ where }) => removerCorrespondentes(estado.pagamentos, where),
    },
    // Consulta e remove parcelas pendentes das obras excluídas.
    parcela: {
      findMany: async ({ where }) => estado.parcelas.filter((item) => corresponde(item, where)),
      deleteMany: async ({ where }) => removerCorrespondentes(estado.parcelas, where),
    },
    // Consulta e remove contratos ligados às obras excluídas.
    contrato: {
      findMany: async ({ where }) => estado.contratos.filter((item) => corresponde(item, where)),
      deleteMany: async ({ where }) => removerCorrespondentes(estado.contratos, where),
    },
    // Consulta e remove aceites de contrato ligados às obras agendadas excluídas.
    contratoAceite: {
      findMany: async ({ where }) => estado.aceites.filter((item) => corresponde(item, where)),
      deleteMany: async ({ where }) => removerCorrespondentes(estado.aceites, where),
    },
    // Consulta e remove eventos ligados às obras excluídas ou automáticos residuais.
    obraEvento: {
      findMany: async ({ where }) => estado.eventos.filter((item) => corresponde(item, where)),
      deleteMany: async ({ where }) => removerCorrespondentes(estado.eventos, where),
    },
    // Consulta, remove pendentes e desvincula convites aceitos das obras excluídas.
    convite: {
      findFirst: async ({ where }) => estado.convites.find((item) => corresponde(item, where)) || null,
      count: async ({ where }) => estado.convites.filter((item) => corresponde(item, where)).length,
      deleteMany: async ({ where }) => removerCorrespondentes(estado.convites, where),
      updateMany: async ({ where, data }) => atualizarCorrespondentes(estado.convites, where, data),
    },
    // Remove notificações ligadas às obras ou ao cliente removido.
    notificacao: { deleteMany: async ({ where }) => removerCorrespondentes(estado.notificacoes, where) },
    // Conta e remove escalas das obras excluídas.
    obraEscala: {
      count: async ({ where }) => estado.escalas.filter((item) => corresponde(item, where)).length,
      deleteMany: async ({ where }) => removerCorrespondentes(estado.escalas, where),
    },
    // Remove disponibilidades das obras excluídas.
    disponibilidadeFuncionario: { deleteMany: async ({ where }) => removerCorrespondentes(estado.disponibilidades, where) },
    // Conta funcionários associados ao usuário para evitar remoção indevida de conta.
    funcionario: {
      count: async ({ where }) => estado.funcionarios.filter((item) => corresponde(item, where)).length,
    },
  };

  // Executa a regra com restauração do estado quando qualquer etapa falha.
  const prisma = {
    ...tx,
    $transaction: async (callback, options) => {
      // Guarda uma cópia completa antes de iniciar as alterações.
      const anterior = structuredClone(estado);
      // Confirma que a regra pede isolamento serializável.
      estado.isolationLevel = options?.isolationLevel;
      try {
        // Executa todas as operações na transação simulada.
        return await callback(tx);
      } catch (falha) {
        // Remove propriedades temporárias criadas depois da cópia inicial.
        Object.keys(estado).filter((chave) => !Object.hasOwn(anterior, chave)).forEach((chave) => delete estado[chave]);
        // Restaura cada tabela e a configuração de falha após erro.
        Object.assign(estado, anterior);
        // Propaga o erro original para a rota ou o teste.
        throw falha;
      }
    },
  };

  // Expõe estado e cliente Prisma falso para as verificações.
  return { estado, prisma };
}

// Remove registros da lista usando o filtro simples do teste.
function removerCorrespondentes(lista, where) {
  // Conta os registros antes de filtrar.
  const antes = lista.length;
  // Calcula quais itens permanecem depois da exclusão.
  const restantes = lista.filter((item) => !corresponde(item, where));
  // Atualiza a lista mantendo sua referência compartilhada.
  lista.splice(0, lista.length, ...restantes);
  // Devolve a quantidade removida.
  return { count: antes - lista.length };
}

// Atualiza registros existentes de acordo com o filtro de teste.
function atualizarCorrespondentes(lista, where, data) {
  // Encontra os registros que devem receber as mudanças.
  const selecionados = lista.filter((item) => corresponde(item, where));
  // Aplica os novos campos a cada registro selecionado.
  selecionados.forEach((item) => Object.assign(item, data));
  // Devolve a quantidade atualizada.
  return { count: selecionados.length };
}

// Exercita as proteções e a remoção transacional de cliente e obras agendadas.
describe("Exclusão de cliente e obras agendadas", () => {
  // Permite remover cliente só com obra agendada, parcelas pendentes, foto inicial e vínculo de convite.
  it("exclui cliente só com obra agendada, parcelas pendentes e evento FOTO inicial", async () => {
    // Inclui os eventos reais observados em obras agendadas recém-criadas.
    const eventoVinculo = { id: "evento-vinculo", obraId: "obra-1", usuarioId: "cliente-1", tipo: "STATUS", descricao: "Cliente Teste aceitou o convite de cliente e vinculou-se à obra.", visivelParaCliente: false };
    const eventoCriacao = { id: "evento-criacao", obraId: "obra-1", usuarioId: "admin-1", tipo: "STATUS", descricao: "Obra criada pela empreiteira.", visivelParaCliente: true };
    const eventoFotoInicial = { id: "evento-foto", obraId: "obra-1", usuarioId: "admin-1", tipo: "FOTO", descricao: "Foto adicionada às informações da obra.", visivelParaCliente: true };
    // Prepara também um aceite na obra ainda agendada sem parcela paga.
    const { estado, prisma } = criarBanco({
      eventos: [eventoVinculo, eventoCriacao, eventoFotoInicial],
      aceites: [{ id: "aceite-1", usuarioId: "cliente-1", contratoId: "contrato-1" }],
    });
    // Executa a exclusão para o ADMIN da mesma empresa.
    const resultado = await excluirClienteComObrasAgendadas(prisma, { clienteId: "cliente-1", empresaId: "empresa-a" });
    // Confirma a remoção completa do cliente criado por convite e de suas obras agendadas.
    assert.equal(resultado.mensagem, "Cliente e obras agendadas excluídos.");
    assert.equal(resultado.usuarioRemovido, true);
    assert.equal(estado.usuarios.length, 0);
    assert.equal(estado.obras.length, 0);
    assert.equal(estado.parcelas.length, 0);
    assert.equal(estado.pagamentos.length, 0);
    assert.equal(estado.contratos.length, 0);
    assert.equal(estado.aceites.length, 0);
    assert.equal(estado.eventos.length, 0);
    assert.equal(estado.convites.some((convite) => convite.usadoEm === null), false);
    assert.equal(estado.convites.find((convite) => convite.id === "convite-usado").obraId, null);
    assert.equal(estado.notificacoes.length, 0);
    assert.equal(estado.escalas.length, 0);
    assert.equal(estado.disponibilidades.length, 0);
    assert.equal(estado.isolationLevel, "Serializable");
  });

  // Bloqueia cliente com obra já iniciada e preserva todos os dados.
  it("bloqueia exclusão de cliente com obra iniciada", async () => {
    // Prepara uma obra em andamento vinculada ao cliente.
    const { estado, prisma } = criarBanco({
      obras: [{ id: "obra-1", empresaId: "empresa-a", clienteId: "cliente-1", nome: "Obra em execução", status: "EM_ANDAMENTO" }],
    });
    // Confirma o bloqueio com o código e a mensagem específica.
    await assert.rejects(
      excluirClienteComObrasAgendadas(prisma, { clienteId: "cliente-1", empresaId: "empresa-a" }),
      { code: "OBRA_INICIADA", message: 'Não é possível excluir o cliente: a obra "Obra em execução" está EM_ANDAMENTO e já saiu de Agendada.' }
    );
    // Confirma que nenhum registro foi apagado.
    assert.equal(estado.usuarios.length, 1);
    assert.equal(estado.obras.length, 1);
    assert.equal(estado.parcelas.length, 1);
  });

  // Confirma que pagamento aprovado ou parcela paga bloqueia a exclusão do cliente.
  it("mantém bloqueado cliente com pagamento realizado ou parcela paga", async () => {
    // Prepara uma tentativa aprovada na obra ainda agendada.
    const { estado, prisma } = criarBanco({
      pagamentos: [{ id: "pagamento-aprovado", usuarioId: "cliente-1", obraId: "obra-1", status: "APROVADO" }],
    });
    // Confirma o código e a mensagem específica da regra de pagamento.
    await assert.rejects(
      excluirClienteComObrasAgendadas(prisma, { clienteId: "cliente-1", empresaId: "empresa-a" }),
      { code: "PAGAMENTO_REALIZADO", message: "Não é possível excluir o cliente: existe parcela paga ou pagamento realizado." }
    );
    // Confirma que usuário, obra e parcelas foram preservados.
    assert.equal(estado.usuarios.length, 1);
    assert.equal(estado.obras.length, 1);
    assert.equal(estado.parcelas.length, 1);
  });

  // Preserva a conta do cliente quando não há comprovação de criação por convite.
  it("preserva conta do usuário quando não foi criada por convite", async () => {
    // Prepara cliente sem convite de cliente aceito no histórico.
    const { estado, prisma } = criarBanco({ convites: [] });
    // Executa a exclusão do cliente com obra agendada.
    const resultado = await excluirClienteComObrasAgendadas(prisma, { clienteId: "cliente-1", empresaId: "empresa-a" });
    // Confirma que a obra foi apagada e a conta foi preservada.
    assert.equal(resultado.usuarioRemovido, false);
    assert.equal(estado.obras.length, 0);
    assert.equal(estado.usuarios.length, 1);
  });

  // Nega acesso quando outra empresa tenta excluir o cliente.
  it("nega tentativa de excluir cliente de outra empresa", async () => {
    // Prepara o cliente pertencente à empresa A.
    const { estado, prisma } = criarBanco();
    // Executa a exclusão autenticada como empresa B.
    await assert.rejects(
      excluirClienteComObrasAgendadas(prisma, { clienteId: "cliente-1", empresaId: "empresa-b" }),
      { code: "CLIENTE_NAO_ENCONTRADO", status: 404, message: "Cliente não encontrado" }
    );
    // Confirma que nada foi alterado na empresa A.
    assert.equal(estado.usuarios.length, 1);
    assert.equal(estado.obras.length, 1);
  });

  // Exclui obra agendada com parcelas pendentes diretamente, preservando o cliente.
  it("exclui obra agendada com parcelas pendentes diretamente", async () => {
    // Prepara obra agendada arquivada com parcelas pendentes e dependências.
    const { estado, prisma } = criarBanco({
      obras: [{ id: "obra-1", empresaId: "empresa-a", clienteId: "cliente-1", nome: "Obra teste", status: "AGENDADA", excluidaEm: new Date() }],
      parcelas: [
        { id: "parcela-1", obraId: "obra-1", situacao: "PENDENTE", pagaEm: null },
        { id: "parcela-2", obraId: "obra-1", situacao: "PENDENTE", pagaEm: null },
      ],
      eventos: [{ id: "evento-foto", obraId: "obra-1", usuarioId: "admin-1", tipo: "FOTO", descricao: "Foto adicionada às informações da obra.", visivelParaCliente: true }],
    });
    // Executa a exclusão direta da obra na mesma empresa.
    const resultado = await excluirObraAgendada(prisma, { obraId: "obra-1", empresaId: "empresa-a" });
    // Confirma que a obra e suas dependências saíram, mas a conta do cliente permaneceu.
    assert.equal(resultado.mensagem, "Obra agendada excluída.");
    assert.equal(estado.obras.length, 0);
    assert.equal(estado.parcelas.length, 0);
    assert.equal(estado.contratos.length, 0);
    assert.equal(estado.eventos.length, 0);
    assert.equal(estado.escalas.length, 0);
    assert.equal(estado.usuarios.length, 1);
  });

  // Nega exclusão direta de obra iniciada, com parcela paga ou pertencente a outra empresa.
  it("bloqueia exclusão direta de obra iniciada, com parcela paga ou de outra empresa", async () => {
    // Testa obra em andamento.
    const iniciada = criarBanco({
      obras: [{ id: "obra-1", empresaId: "empresa-a", clienteId: "cliente-1", nome: "Obra ativa", status: "EM_ANDAMENTO" }],
    });
    await assert.rejects(
      excluirObraAgendada(iniciada.prisma, { obraId: "obra-1", empresaId: "empresa-a" }),
      { code: "OBRA_INICIADA" }
    );
    assert.equal(iniciada.estado.obras.length, 1);

    // Testa obra agendada com parcela paga.
    const comParcelaPaga = criarBanco({
      parcelas: [{ id: "parcela-1", obraId: "obra-1", situacao: "PAGA", pagaEm: new Date() }],
    });
    await assert.rejects(
      excluirObraAgendada(comParcelaPaga.prisma, { obraId: "obra-1", empresaId: "empresa-a" }),
      { code: "PAGAMENTO_REALIZADO" }
    );
    assert.equal(comParcelaPaga.estado.obras.length, 1);

    // Testa tentativa em obra de outra empresa.
    const outraEmpresa = criarBanco();
    await assert.rejects(
      excluirObraAgendada(outraEmpresa.prisma, { obraId: "obra-1", empresaId: "empresa-b" }),
      { code: "OBRA_NAO_ENCONTRADA", status: 404 }
    );
    assert.equal(outraEmpresa.estado.obras.length, 1);
  });

  // Confirma que foto inicial e eventos administrativos não contam como histórico real.
  it("separa eventos administrativos e foto inicial dos registros reais de trabalho", () => {
    // Ignora a criação automática da obra, vínculo do convite e foto inicial.
    assert.equal(eventoAutomatico({ tipo: "FOTO", descricao: "Foto adicionada às informações da obra." }), true);
    assert.equal(eventoHistoricoReal({ tipo: "FOTO", descricao: "Foto adicionada às informações da obra." }), false);
    assert.equal(eventoHistoricoReal({ tipo: "STATUS", descricao: "Obra criada pela empreiteira." }), false);
    assert.equal(eventoHistoricoReal({ tipo: "STATUS", descricao: "Cliente Teste aceitou o convite de cliente e vinculou-se à obra." }), false);
    assert.equal(eventoHistoricoReal({ tipo: "AGENDAMENTO", descricao: "Obra reagendada." }), false);
    assert.equal(eventoHistoricoReal({ tipo: "EQUIPE", descricao: "Gerente recebeu acesso." }), false);
    assert.equal(eventoHistoricoReal({ tipo: "CONTRATO", descricao: "Contrato anexado." }), false);
    // Preserva andamento, ocorrência, anotação de trabalho e fotografia de andamento.
    assert.equal(eventoHistoricoReal({ tipo: "ATUALIZACAO", descricao: "Etapa iniciada." }), true);
    assert.equal(eventoHistoricoReal({ tipo: "OCORRENCIA", descricao: "Interferência registrada." }), true);
    assert.equal(eventoHistoricoReal({ tipo: "ANOTACAO", descricao: "Medição conferida." }), true);
    assert.equal(eventoHistoricoReal({ tipo: "FOTO", descricao: "Foto da execução." }), true);
  });

  // Confirma que falha depois de excluir filhos reverte toda a transação.
  it("faz rollback completo se a exclusão da obra falhar no meio", async () => {
    // Prepara falha simulada depois de remover parcelas, convites e eventos.
    const { estado, prisma } = criarBanco({ falharAoExcluirObra: true });
    // Guarda o estado esperado antes de iniciar a transação.
    const anterior = structuredClone(estado);
    // Confirma que a falha original é propagada para a rota.
    await assert.rejects(
      excluirClienteComObrasAgendadas(prisma, { clienteId: "cliente-1", empresaId: "empresa-a" }),
      /Falha simulada ao excluir a obra/
    );
    // Confirma que nenhuma tabela ficou parcialmente alterada.
    assert.deepEqual(estado, anterior);
  });
});
