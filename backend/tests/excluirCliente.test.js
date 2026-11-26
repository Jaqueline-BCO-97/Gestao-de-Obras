// Usa o executor de testes nativo sem abrir conexão com banco compartilhado.
const { describe, it } = require("node:test");
// Fornece verificações estritas sobre respostas e estado dos registros simulados.
const assert = require("node:assert/strict");
// Importa a regra de exclusão e a classificação de eventos automáticos.
const { eventoAutomatico, eventoHistoricoReal, excluirClienteComObrasAgendadas } = require("../src/services/excluirCliente");

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
  // Preenche as tabelas mínimas para testar a exclusão sem dependências externas.
  const estado = {
    usuarios: [{ id: "cliente-1", empresaId: "empresa-a", tipo: "CLIENTE", nome: "Cliente Teste" }],
    obras: [{ id: "obra-1", empresaId: "empresa-a", clienteId: "cliente-1", nome: "Obra agendada", status: "AGENDADA" }],
    parcelas: [{ id: "parcela-1", obraId: "obra-1", situacao: "PENDENTE", pagaEm: null }],
    pagamentos: [{ id: "pagamento-1", usuarioId: "cliente-1", obraId: "obra-1", status: "CANCELADO" }],
    contratos: [{ id: "contrato-1", obraId: "obra-1" }],
    aceites: [],
    eventos: [],
    convites: [{ id: "convite-pendente", obraId: "obra-1", usadoEm: null }, { id: "convite-usado", obraId: "obra-1", usadoEm: new Date("2026-01-01T00:00:00.000Z") }],
    notificacoes: [{ id: "notificacao-1", obraId: "obra-1" }],
    escalas: [{ id: "escala-1", obraId: "obra-1" }],
    disponibilidades: [{ id: "disponibilidade-1", obraId: "obra-1" }],
    falharAoExcluirObra: false,
    ...dados,
  };

  // Cria métodos de consulta e exclusão para cada tabela usada pela regra.
  const tx = {
    // Busca um usuário sem permitir atravessar o escopo informado.
    usuario: {
      findFirst: async ({ where }) => estado.usuarios.find((item) => corresponde(item, where)) || null,
      // Remove o usuário somente depois que os registros filhos foram tratados.
      delete: async ({ where }) => { const indice = estado.usuarios.findIndex((item) => corresponde(item, where)); return estado.usuarios.splice(indice, 1)[0]; },
    },
    // Consulta e remove as obras ligadas ao cliente.
    obra: {
      findMany: async ({ where }) => estado.obras.filter((item) => corresponde(item, where)),
      // Simula uma falha após as exclusões anteriores para verificar rollback.
      deleteMany: async ({ where }) => {
        if (estado.falharAoExcluirObra) throw new Error("Falha simulada ao excluir a obra");
        const antes = estado.obras.length;
        estado.obras = estado.obras.filter((item) => !corresponde(item, where));
        return { count: antes - estado.obras.length };
      },
    },
    // Consulta tentativas de pagamento e remove as que pertencem às obras eliminadas.
    pagamento: {
      findMany: async ({ where }) => estado.pagamentos.filter((item) => corresponde(item, where)),
      deleteMany: async ({ where }) => removerCorrespondentes(estado.pagamentos, where),
    },
    // Consulta e remove as parcelas vinculadas às obras.
    parcela: {
      findMany: async ({ where }) => estado.parcelas.filter((item) => corresponde(item, where)),
      deleteMany: async ({ where }) => removerCorrespondentes(estado.parcelas, where),
    },
    // Consulta contratos e remove contratos que ainda não foram aceitos.
    contrato: {
      findMany: async ({ where }) => estado.contratos.filter((item) => corresponde(item, where)),
      deleteMany: async ({ where }) => removerCorrespondentes(estado.contratos, where),
    },
    // Consulta aceite pelo cliente ou por contrato ligado às obras dele.
    contratoAceite: {
      findMany: async ({ where }) => estado.aceites.filter((item) => corresponde(item, where)),
    },
    // Consulta eventos nas obras e eventos escritos pelo cliente.
    obraEvento: {
      findMany: async ({ where }) => estado.eventos.filter((item) => corresponde(item, where)),
      deleteMany: async ({ where }) => removerCorrespondentes(estado.eventos, where),
    },
    // Remove convites pendentes ligados às obras.
    convite: {
      deleteMany: async ({ where }) => removerCorrespondentes(estado.convites, where),
      // Desvincula convites aceitos para preservar o registro histórico.
      updateMany: async ({ where, data }) => atualizarCorrespondentes(estado.convites, where, data),
    },
    // Remove notificações ligadas às obras que serão excluídas.
    notificacao: { deleteMany: async ({ where }) => removerCorrespondentes(estado.notificacoes, where) },
    // Remove escalas das obras eliminadas.
    obraEscala: { deleteMany: async ({ where }) => removerCorrespondentes(estado.escalas, where) },
    // Remove disponibilidades das obras eliminadas.
    disponibilidadeFuncionario: { deleteMany: async ({ where }) => removerCorrespondentes(estado.disponibilidades, where) },
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
describe("Exclusão de cliente com obras agendadas", () => {
  // Permite remover cliente e dependências sem pagamento, aceite ou histórico de trabalho.
  it("exclui cliente com somente obra agendada, parcelas pendentes e contrato sem aceite", async () => {
    // Prepara um registro automático criado pelo aceite do convite.
    const eventoVinculo = { id: "evento-vinculo", obraId: "obra-1", usuarioId: "cliente-1", tipo: "STATUS", descricao: "Cliente Teste aceitou o convite de cliente e vinculou-se à obra.", visivelParaCliente: false };
    // Prepara também o evento automático de criação de obra.
    const eventoCriacao = { id: "evento-criacao", obraId: "obra-1", usuarioId: "admin-1", tipo: "STATUS", descricao: "Obra criada pela empreiteira.", visivelParaCliente: true };
    // Cria o banco falso com ambos os eventos e somente uma parcela pendente.
    const { estado, prisma } = criarBanco({ eventos: [eventoVinculo, eventoCriacao] });
    // Executa a exclusão para o ADMIN da mesma empresa.
    const resultado = await excluirClienteComObrasAgendadas(prisma, { clienteId: "cliente-1", empresaId: "empresa-a" });
    // Confirma a resposta de sucesso específica para remoção das obras agendadas.
    assert.equal(resultado.mensagem, "Cliente e obras agendadas excluídos.");
    // Confirma que usuário e obra foram excluídos.
    assert.equal(estado.usuarios.length, 0);
    assert.equal(estado.obras.length, 0);
    // Confirma que parcelas, tentativas, contrato sem aceite e convites pendentes foram removidos.
    assert.equal(estado.parcelas.length, 0);
    assert.equal(estado.pagamentos.length, 0);
    assert.equal(estado.contratos.length, 0);
    assert.equal(estado.convites.some((convite) => convite.usadoEm === null), false);
    // Confirma que o convite aceito foi preservado sem referência à obra apagada.
    assert.equal(estado.convites.find((convite) => convite.id === "convite-usado").obraId, null);
    // Confirma que notificações, escalas e disponibilidades foram removidas.
    assert.equal(estado.notificacoes.length, 0);
    assert.equal(estado.escalas.length, 0);
    assert.equal(estado.disponibilidades.length, 0);
    // Confirma que o isolamento solicitado foi serializável.
    assert.equal(estado.isolationLevel, "Serializable");
  });

  // Confirma que pagamento aprovado continua bloqueando e preserva os dados.
  it("mantém bloqueado cliente com pagamento realizado", async () => {
    // Prepara uma tentativa aprovada na obra ainda agendada.
    const { estado, prisma } = criarBanco({ pagamentos: [{ id: "pagamento-aprovado", usuarioId: "cliente-1", obraId: "obra-1", status: "APROVADO" }] });
    // Confirma o código e a mensagem específica da regra de pagamento.
    await assert.rejects(excluirClienteComObrasAgendadas(prisma, { clienteId: "cliente-1", empresaId: "empresa-a" }), { code: "PAGAMENTO_REALIZADO", message: "Não é possível excluir o cliente: existe pagamento realizado." });
    // Confirma que a transação não removeu usuário, obra ou parcelas.
    assert.equal(estado.usuarios.length, 1);
    assert.equal(estado.obras.length, 1);
    assert.equal(estado.parcelas.length, 1);
  });

  // Confirma explicitamente que o evento automático do aceite não conta como histórico real.
  it("permite excluir cliente cujo único evento é o vínculo automático do convite", async () => {
    // Registra o evento automático com o mesmo texto salvo pela rota de aceite.
    const evento = { id: "evento-vinculo", obraId: "obra-1", usuarioId: "cliente-1", tipo: "STATUS", descricao: "Cliente Teste aceitou o convite de cliente e vinculou-se à obra.", visivelParaCliente: false };
    // Confirma a classificação automática usada na validação.
    assert.equal(eventoAutomatico(evento), true);
    // Prepara o estado com esse evento e nenhuma outra atividade.
    const { estado, prisma } = criarBanco({ eventos: [evento] });
    // Tenta excluir o cliente e sua única obra agendada.
    await excluirClienteComObrasAgendadas(prisma, { clienteId: "cliente-1", empresaId: "empresa-a" });
    // Confirma que usuário, obra e evento de vínculo foram removidos.
    assert.equal(estado.usuarios.length, 0);
    assert.equal(estado.obras.length, 0);
    assert.equal(estado.eventos.length, 0);
  });

  // Documenta pela regra executável quais eventos contam como trabalho real.
  it("separa eventos administrativos automáticos dos registros reais de trabalho", () => {
    // Ignora a criação automática da obra.
    assert.equal(eventoHistoricoReal({ tipo: "STATUS", descricao: "Obra criada pela empreiteira." }), false);
    // Ignora o vínculo automático gerado ao aceitar convite de cliente.
    assert.equal(eventoHistoricoReal({ tipo: "STATUS", descricao: "Cliente Teste aceitou o convite de cliente e vinculou-se à obra." }), false);
    // Ignora mudanças de calendário, equipe e anexação de contrato não aceito.
    assert.equal(eventoHistoricoReal({ tipo: "AGENDAMENTO", descricao: "Obra reagendada." }), false);
    assert.equal(eventoHistoricoReal({ tipo: "EQUIPE", descricao: "Gerente recebeu acesso." }), false);
    assert.equal(eventoHistoricoReal({ tipo: "CONTRATO", descricao: "Contrato anexado." }), false);
    // Preserva andamento, ocorrência, anotação de trabalho e fotografia real.
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
    await assert.rejects(excluirClienteComObrasAgendadas(prisma, { clienteId: "cliente-1", empresaId: "empresa-a" }), /Falha simulada ao excluir a obra/);
    // Confirma que nenhuma tabela ficou parcialmente alterada.
    assert.deepEqual(estado, anterior);
  });

  // Confirma que obra iniciada, aceite e atividade real retornam motivos distintos.
  it("informa separadamente obra iniciada, contrato aceito e histórico real", async () => {
    // Prepara uma obra que já deixou o estado Agendada.
    const obraIniciada = criarBanco({ obras: [{ id: "obra-1", empresaId: "empresa-a", clienteId: "cliente-1", nome: "Obra em execução", status: "EM_ANDAMENTO" }] });
    // Confirma que a mensagem identifica o estado impeditivo da obra.
    await assert.rejects(excluirClienteComObrasAgendadas(obraIniciada.prisma, { clienteId: "cliente-1", empresaId: "empresa-a" }), { code: "OBRA_INICIADA", message: 'Não é possível excluir o cliente: a obra "Obra em execução" está EM_ANDAMENTO e já saiu de Agendada.' });
    // Prepara aceite vinculado ao contrato da obra.
    const contratoAceito = criarBanco({ aceites: [{ id: "aceite-1", usuarioId: "cliente-1", contratoId: "contrato-1" }] });
    // Confirma a mensagem específica para contrato aceito.
    await assert.rejects(excluirClienteComObrasAgendadas(contratoAceito.prisma, { clienteId: "cliente-1", empresaId: "empresa-a" }), { code: "CONTRATO_ACEITO", message: "Não é possível excluir o cliente: existe contrato aceito." });
    // Prepara uma anotação real de andamento registrada na obra.
    const eventoHistorico = { id: "evento-andamento", obraId: "obra-1", usuarioId: "colaborador-1", tipo: "ATUALIZACAO", descricao: "Etapa de alvenaria iniciada.", visivelParaCliente: true };
    // Confirma a mensagem com o tipo de evento que precisa ser preservado.
    const historico = criarBanco({ eventos: [eventoHistorico] });
    await assert.rejects(excluirClienteComObrasAgendadas(historico.prisma, { clienteId: "cliente-1", empresaId: "empresa-a" }), { code: "HISTORICO_REAL", message: "Não é possível excluir o cliente: existe histórico real de obra (ATUALIZACAO)." });
  });
});
