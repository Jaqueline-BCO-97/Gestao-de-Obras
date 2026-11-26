// Marca os eventos de trabalho que representam atividade ou documentação real da obra.
const TIPOS_HISTORICO_REAL = new Set(["ANOTACAO", "ATUALIZACAO", "OCORRENCIA", "FOTO", "CONTRATACAO", "ORCAMENTO_APROVADO"]);

// Marca tipos de evento administrativo que não comprovam execução de trabalho.
const TIPOS_EVENTO_ADMINISTRATIVO = new Set(["AGENDAMENTO", "EQUIPE", "CONTRATO"]);

// Define descrições automáticas que podem aparecer em registros de anotação antigos.
const DESCRICOES_ANOTACAO_AUTOMATICA = [
  "Dados básicos da obra atualizados pela empreiteira.",
];

// Identifica eventos automáticos de vínculo, cadastro inicial ou manutenção da obra.
function eventoAutomatico(evento) {
  // Lê a descrição como texto mesmo em registros legados incompletos.
  const descricao = String(evento?.descricao || "");
  // Ignora a abertura automática criada junto com qualquer obra nova.
  if (evento?.tipo === "STATUS" && descricao === "Obra criada pela empreiteira.") return true;
  // Ignora o evento gerado quando o cliente aceita o convite e se vincula à obra.
  if (evento?.tipo === "STATUS" && /aceitou o convite de cliente e vinculou-se à obra\.$/u.test(descricao)) return true;
  // Ignora o registro administrativo de arquivamento enquanto a obra segue Agendada.
  if (evento?.tipo === "STATUS" && descricao === "Obra agendada arquivada pela empreiteira.") return true;
  // Ignora o registro automático gerado quando fotos iniciais são anexadas no cadastro da obra.
  if (evento?.tipo === "FOTO" && descricao === "Foto adicionada às informações da obra.") return true;
  // Ignora alterações de calendário, equipe e anexação de contrato ainda não aceito.
  if (TIPOS_EVENTO_ADMINISTRATIVO.has(evento?.tipo)) return true;
  // Ignora anotações automáticas de atualização cadastral da obra.
  if (evento?.tipo === "ANOTACAO" && DESCRICOES_ANOTACAO_AUTOMATICA.includes(descricao)) return true;
  // Ignora alterações automáticas de vencimento, que não são atividade de obra.
  if (evento?.tipo === "ANOTACAO" && descricao.startsWith("Vencimento das parcelas alterado de ")) return true;
  // Mantém os demais eventos para a classificação de histórico real.
  return false;
}

// Decide se o evento representa trabalho real que precisa ser preservado.
function eventoHistoricoReal(evento) {
  // Não classifica pagamentos como histórico porque eles têm bloqueio próprio.
  if (evento?.tipo === "PAGAMENTO") return false;
  // Ignora eventos administrativos e automáticos identificados pelo fluxo atual.
  if (eventoAutomatico(evento)) return false;
  // Preserva os tipos de histórico conhecidos e bloqueia tipos novos por segurança.
  return TIPOS_HISTORICO_REAL.has(evento?.tipo) || !TIPOS_EVENTO_ADMINISTRATIVO.has(evento?.tipo);
}

// Cria um erro de regra de negócio com status e código próprios para a rota.
function erroExclusao(codigo, mensagem, status = 409) {
  // Anexa o código estável que a API e a tela usam para distinguir o motivo.
  return Object.assign(new Error(mensagem), { code: codigo, status });
}

// Verifica se há qualquer parcela quitada, pagamento aprovado ou evento financeiro nas obras.
function possuiPagamentoRealizado({ pagamentos = [], parcelas = [], eventos = [] }) {
  // Confirma se alguma tentativa de pagamento foi aprovada pelo provedor.
  const pagamentoAprovado = pagamentos.some((pagamento) => pagamento.status === "APROVADO");
  // Confirma se alguma parcela já foi marcada como paga ou possui data de quitação.
  const parcelaPaga = parcelas.some((parcela) => parcela.situacao === "PAGA" || Boolean(parcela.pagaEm));
  // Confirma se existe evento financeiro registrado na linha do tempo.
  const eventoPagamento = eventos.some((evento) => evento.tipo === "PAGAMENTO");
  // Bloqueia quando qualquer um dos três indicadores confirmar pagamento realizado.
  return pagamentoAprovado || parcelaPaga || eventoPagamento;
}

// Remove obras agendadas e todas as dependências na ordem exigida pelas chaves estrangeiras.
async function removerObrasAgendadasNaTransacao(tx, { obraIds, empresaId, contratoIds = [] }) {
  // Sai sem consultas quando não há obras agendadas para apagar.
  if (!obraIds.length) return 0;
  // Apaga notificações ligadas às obras que serão excluídas.
  await tx.notificacao.deleteMany({ where: { obraId: { in: obraIds } } });
  // Remove escalas de gerentes/colaboradores ligadas às obras agendadas.
  await tx.obraEscala.deleteMany({ where: { obraId: { in: obraIds } } });
  // Remove disponibilidades de funcionários que apontam para essas obras.
  await tx.disponibilidadeFuncionario.deleteMany({ where: { obraId: { in: obraIds } } });
  // Remove convites ainda não aceitos vinculados às obras excluídas.
  await tx.convite.deleteMany({ where: { obraId: { in: obraIds }, usadoEm: null } });
  // Preserva convites já aceitos retirando apenas a referência à obra apagada.
  await tx.convite.updateMany({ where: { obraId: { in: obraIds }, usadoEm: { not: null } }, data: { obraId: null } });
  // Remove tentativas de pagamento não aprovadas ligadas às obras.
  await tx.pagamento.deleteMany({ where: { obraId: { in: obraIds } } });
  // Remove parcelas pendentes antes das obras para respeitar a chave estrangeira.
  await tx.parcela.deleteMany({ where: { obraId: { in: obraIds } } });
  // Remove eventuais aceites ligados aos contratos dessas obras agendadas sem pagamento.
  if (contratoIds.length && tx.contratoAceite?.deleteMany) {
    await tx.contratoAceite.deleteMany({ where: { contratoId: { in: contratoIds } } });
  }
  // Remove contratos anexados às obras excluídas.
  await tx.contrato.deleteMany({ where: { obraId: { in: obraIds } } });
  // Remove os eventos da linha do tempo pertencentes às obras excluídas.
  await tx.obraEvento.deleteMany({ where: { obraId: { in: obraIds } } });
  // Exclui as obras somente se continuarem na empresa e com status Agendada.
  const obrasExcluidas = await tx.obra.deleteMany({ where: { id: { in: obraIds }, empresaId, status: "AGENDADA" } });
  // Retorna a quantidade removida para o chamador validar concorrência.
  return obrasExcluidas.count;
}

// Verifica com segurança se a conta do cliente foi criada por convite e não tem outros vínculos.
async function podeRemoverContaCliente(tx, { cliente, empresaId, obraIds, contratoIds, aceites, eventos }) {
  // Exige explicitamente o papel CLIENTE antes de qualquer remoção de usuário.
  if (cliente.tipo !== "CLIENTE") return false;
  // Confere se existe um convite de cliente já aceito vinculado ao cliente ou às obras dele.
  const conviteAceito = tx.convite?.findFirst
    ? await tx.convite.findFirst({
      where: {
        empresaId,
        tipo: "CLIENTE",
        usadoEm: { not: null },
        OR: [
          ...(cliente.email ? [{ email: cliente.email }] : []),
          ...(obraIds.length ? [{ obraId: { in: obraIds } }] : []),
        ],
      },
      select: { id: true },
    })
    : { id: "legado" };
  // Preserva a conta se não houver comprovação de criação via convite.
  if (!conviteAceito) return false;
  // Confere se há aceite em contrato de outra obra fora do conjunto apagado.
  const aceiteFora = aceites.some((aceite) => !contratoIds.includes(aceite.contratoId));
  // Confere se há evento não automático do cliente em obra fora do conjunto apagado.
  const eventoFora = eventos.some((evento) => !obraIds.includes(evento.obraId) && !eventoAutomatico(evento));
  // Preserva a conta se houver histórico ou aceite em outras obras.
  if (aceiteFora || eventoFora) return false;
  // Confere se o usuário também está ligado a um cadastro de funcionário.
  const funcionarioVinculado = tx.funcionario?.count ? await tx.funcionario.count({ where: { usuarioId: cliente.id } }) : 0;
  // Confere se o usuário alterou alguma escala fora das obras que serão apagadas.
  const escalasAlteradas = tx.obraEscala?.count
    ? await tx.obraEscala.count({ where: { alteradoPorId: cliente.id, ...(obraIds.length ? { obraId: { notIn: obraIds } } : {}) } })
    : 0;
  // Confere se o usuário criou algum convite no sistema.
  const convitesCriados = tx.convite?.count ? await tx.convite.count({ where: { criadoPorId: cliente.id } }) : 0;
  // Só libera a exclusão do usuário quando não houver nenhum vínculo externo.
  return funcionarioVinculado === 0 && escalasAlteradas === 0 && convitesCriados === 0;
}

// Exclui cliente e suas obras agendadas em uma transação serializável.
async function excluirClienteComObrasAgendadas(prisma, { clienteId, empresaId }) {
  // Abre uma transação para validar os bloqueios antes de remover qualquer dado.
  return prisma.$transaction(async (tx) => {
    // Busca somente o cliente do tipo correto dentro da empresa autenticada.
    const cliente = await tx.usuario.findFirst({
      where: { id: clienteId, empresaId, tipo: "CLIENTE" },
      select: { id: true, nome: true, email: true, tipo: true },
    });
    // Devolve 404 sem revelar perfis de outras empresas.
    if (!cliente) throw erroExclusao("CLIENTE_NAO_ENCONTRADO", "Cliente não encontrado", 404);

    // Carrega todas as obras vinculadas ao cliente na empresa (ativas e arquivadas).
    const obras = await tx.obra.findMany({
      where: { empresaId, clienteId: cliente.id },
      select: { id: true, nome: true, status: true },
    });
    // Reúne os identificadores para consultar dependências em lote.
    const obraIds = obras.map((obra) => obra.id);
    // Consulta tentativas financeiras vinculadas ao cliente ou às obras dele.
    const pagamentos = await tx.pagamento.findMany({
      where: obraIds.length ? { OR: [{ usuarioId: cliente.id }, { obraId: { in: obraIds } }] } : { usuarioId: cliente.id },
      select: { id: true, usuarioId: true, obraId: true, status: true },
    });
    // Consulta parcelas das obras para validar pagamentos efetivamente realizados.
    const parcelas = obraIds.length ? await tx.parcela.findMany({
      where: { obraId: { in: obraIds } },
      select: { id: true, obraId: true, situacao: true, pagaEm: true },
    }) : [];
    // Localiza contratos das obras para remover aceites dependentes antes da obra.
    const contratos = obraIds.length ? await tx.contrato.findMany({
      where: { obraId: { in: obraIds } },
      select: { id: true, obraId: true },
    }) : [];
    // Reúne os identificadores de contratos para consultar aceites.
    const contratoIds = contratos.map((contrato) => contrato.id);
    // Consulta aceites do cliente ou vinculados aos contratos dessas obras.
    const aceites = await tx.contratoAceite.findMany({
      where: contratoIds.length ? { OR: [{ usuarioId: cliente.id }, { contratoId: { in: contratoIds } }] } : { usuarioId: cliente.id },
      select: { id: true, usuarioId: true, contratoId: true },
    });
    // Consulta eventos ligados às obras ou registrados pelo cliente.
    const eventos = await tx.obraEvento.findMany({
      where: obraIds.length ? { OR: [{ obraId: { in: obraIds } }, { usuarioId: cliente.id }] } : { usuarioId: cliente.id },
      select: { id: true, obraId: true, usuarioId: true, tipo: true, descricao: true, visivelParaCliente: true },
    });

    // Bloqueia quando alguma obra já saiu do status Agendada.
    const obraIniciada = obras.find((obra) => obra.status !== "AGENDADA");
    // Informa exatamente qual obra impede a exclusão do cliente.
    if (obraIniciada) throw erroExclusao("OBRA_INICIADA", `Não é possível excluir o cliente: a obra "${obraIniciada.nome}" está ${obraIniciada.status} e já saiu de Agendada.`);

    // Bloqueia quando há parcela paga ou pagamento aprovado nas obras ou para o cliente.
    if (possuiPagamentoRealizado({ pagamentos, parcelas, eventos })) {
      throw erroExclusao("PAGAMENTO_REALIZADO", "Não é possível excluir o cliente: existe parcela paga ou pagamento realizado.");
    }

    // Impede que uma tentativa financeira em outra obra perca a referência ao cliente.
    const pagamentoEmOutraObra = pagamentos.some((pagamento) => pagamento.obraId && !obraIds.includes(pagamento.obraId));
    // Explica que o pagamento segue ligado a uma obra que não será excluída.
    if (pagamentoEmOutraObra) throw erroExclusao("PAGAMENTO_EM_OUTRA_OBRA", "Não é possível excluir o cliente: há uma tentativa de pagamento vinculada a outra obra.");

    // Separa eventos automáticos do cliente que ficaram em obras anteriormente desvinculadas.
    const idsEventosAutomaticosDoCliente = eventos
      .filter((evento) => evento.usuarioId === cliente.id && !obraIds.includes(evento.obraId) && eventoAutomatico(evento))
      .map((evento) => evento.id);

    // Avalia antes da remoção se a conta do usuário deve ser apagada ou preservada.
    const removerUsuario = await podeRemoverContaCliente(tx, {
      cliente,
      empresaId,
      obraIds,
      contratoIds,
      aceites,
      eventos,
    });

    // Remove dependências e todas as obras agendadas do cliente na ordem correta.
    const quantidadeObrasExcluidas = await removerObrasAgendadasNaTransacao(tx, { obraIds, empresaId, contratoIds });
    // Força rollback se uma obra mudou de estado ou vínculo durante a exclusão.
    if (quantidadeObrasExcluidas !== obraIds.length) {
      throw erroExclusao("CLIENTE_EXCLUSAO_CONCORRENTE", "Os dados do cliente mudaram durante a exclusão. Atualize a tela e tente novamente.");
    }

    // Remove a conta do usuário somente se foi criada por convite e não tiver outros vínculos.
    if (removerUsuario) {
      // Remove eventos automáticos residuais do cliente fora das obras excluídas.
      if (idsEventosAutomaticosDoCliente.length) {
        await tx.obraEvento.deleteMany({ where: { id: { in: idsEventosAutomaticosDoCliente } } });
      }
      // Remove notificações diretamente ligadas ao usuário antes de apagá-lo.
      await tx.notificacao.deleteMany({ where: { usuarioId: cliente.id } });
      // Exclui o perfil do cliente após todas as dependências terem sido removidas.
      await tx.usuario.delete({ where: { id: cliente.id } });
      // Retorna confirmação completa quando cliente e obras agendadas foram excluídos.
      return { mensagem: "Cliente e obras agendadas excluídos.", usuarioRemovido: true };
    }

    // Informa que as obras agendadas foram removidas, mas a conta do usuário foi preservada.
    return {
      mensagem: "Obras agendadas excluídas. A conta do usuário foi preservada por não ter origem em convite ou possuir outros vínculos.",
      usuarioRemovido: false,
    };
  }, { isolationLevel: "Serializable" });
}

// Exclui diretamente uma obra Agendada sem parcela paga na mesma empresa, preservando o cliente.
async function excluirObraAgendada(prisma, { obraId, empresaId }) {
  // Executa validação e exclusão em uma única transação serializável.
  return prisma.$transaction(async (tx) => {
    // Busca a obra dentro da empresa do token, incluindo obras já arquivadas.
    const obra = await tx.obra.findFirst({
      where: { id: obraId, empresaId },
      select: { id: true, nome: true, status: true },
    });
    // Responde 404 sem revelar obras de outras empresas.
    if (!obra) throw erroExclusao("OBRA_NAO_ENCONTRADA", "Obra não encontrada", 404);
    // Só permite exclusão definitiva quando a obra ainda está Agendada.
    if (obra.status !== "AGENDADA") {
      throw erroExclusao("OBRA_INICIADA", `Não é possível excluir a obra: "${obra.nome}" está ${obra.status} e já saiu de Agendada.`);
    }

    // Carrega parcelas, tentativas de pagamento, eventos e contrato da obra.
    const [parcelas, pagamentos, eventos, contratos] = await Promise.all([
      tx.parcela.findMany({ where: { obraId: obra.id }, select: { id: true, situacao: true, pagaEm: true } }),
      tx.pagamento.findMany({ where: { obraId: obra.id }, select: { id: true, status: true } }),
      tx.obraEvento.findMany({ where: { obraId: obra.id }, select: { id: true, tipo: true } }),
      tx.contrato.findMany({ where: { obraId: obra.id }, select: { id: true } }),
    ]);

    // Bloqueia quando houver qualquer parcela paga ou pagamento aprovado.
    if (possuiPagamentoRealizado({ pagamentos, parcelas, eventos })) {
      throw erroExclusao("PAGAMENTO_REALIZADO", "Não é possível excluir a obra: existe parcela paga ou pagamento realizado.");
    }

    // Coleta identificadores de contrato para remover eventuais aceites vinculados.
    const contratoIds = contratos.map((contrato) => contrato.id);
    // Remove dependências e a própria obra na ordem correta das chaves estrangeiras.
    const removidas = await removerObrasAgendadasNaTransacao(tx, {
      obraIds: [obra.id],
      empresaId,
      contratoIds,
    });
    // Garante atomicidade caso a obra tenha mudado de estado durante a transação.
    if (removidas !== 1) {
      throw erroExclusao("OBRA_EXCLUSAO_CONCORRENTE", "A obra foi alterada durante a exclusão. Atualize a tela e tente novamente.");
    }

    // Devolve a confirmação sem apagar a conta do cliente vinculado.
    return { mensagem: "Obra agendada excluída." };
  }, { isolationLevel: "Serializable" });
}

// Exporta as regras para as rotas e para testes isolados sem acessar banco compartilhado.
module.exports = {
  eventoAutomatico,
  eventoHistoricoReal,
  excluirClienteComObrasAgendadas,
  excluirObraAgendada,
};
