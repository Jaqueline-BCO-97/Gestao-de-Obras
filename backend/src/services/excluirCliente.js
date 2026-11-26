// Marca os eventos de trabalho que representam atividade ou documentação real da obra.
const TIPOS_HISTORICO_REAL = new Set(["ANOTACAO", "ATUALIZACAO", "OCORRENCIA", "FOTO", "CONTRATACAO", "ORCAMENTO_APROVADO"]);

// Marca tipos de evento administrativo que não comprovam execução de trabalho.
const TIPOS_EVENTO_ADMINISTRATIVO = new Set(["AGENDAMENTO", "EQUIPE", "CONTRATO"]);

// Define descrições automáticas que podem aparecer em registros de anotação antigos.
const DESCRICOES_ANOTACAO_AUTOMATICA = [
  "Dados básicos da obra atualizados pela empreiteira.",
];

// Identifica eventos automáticos de vínculo ou manutenção da obra.
function eventoAutomatico(evento) {
  // Lê a descrição como texto mesmo em registros legados incompletos.
  const descricao = String(evento.descricao || "");
  // Ignora a abertura automática criada junto com qualquer obra nova.
  if (evento.tipo === "STATUS" && descricao === "Obra criada pela empreiteira.") return true;
  // Ignora o evento gerado quando o cliente aceita o convite e se vincula à obra.
  if (evento.tipo === "STATUS" && /aceitou o convite de cliente e vinculou-se à obra\.$/u.test(descricao)) return true;
  // Ignora o registro administrativo de arquivamento enquanto a obra segue Agendada.
  if (evento.tipo === "STATUS" && descricao === "Obra agendada arquivada pela empreiteira.") return true;
  // Ignora alterações de calendário, equipe e anexação de contrato ainda não aceito.
  if (TIPOS_EVENTO_ADMINISTRATIVO.has(evento.tipo)) return true;
  // Ignora anotações automáticas de atualização cadastral da obra.
  if (evento.tipo === "ANOTACAO" && DESCRICOES_ANOTACAO_AUTOMATICA.includes(descricao)) return true;
  // Ignora alterações automáticas de vencimento, que não são atividade de obra.
  if (evento.tipo === "ANOTACAO" && descricao.startsWith("Vencimento das parcelas alterado de ")) return true;
  // Mantém os demais eventos para a classificação de histórico real.
  return false;
}

// Decide se o evento representa trabalho real que precisa ser preservado.
function eventoHistoricoReal(evento) {
  // Não classifica pagamentos como histórico porque eles têm bloqueio próprio.
  if (evento.tipo === "PAGAMENTO") return false;
  // Ignora eventos administrativos e automáticos identificados pelo fluxo atual.
  if (eventoAutomatico(evento)) return false;
  // Preserva os tipos de histórico conhecidos e bloqueia tipos novos por segurança.
  return TIPOS_HISTORICO_REAL.has(evento.tipo) || !TIPOS_EVENTO_ADMINISTRATIVO.has(evento.tipo);
}

// Cria um erro de regra de negócio com status e código próprios para a rota.
function erroExclusao(codigo, mensagem, status = 409) {
  // Anexa o código estável que a API e a tela usam para distinguir o motivo.
  return Object.assign(new Error(mensagem), { code: codigo, status });
}

// Exclui cliente e vínculos elegíveis em uma transação serializável.
async function excluirClienteComObrasAgendadas(prisma, { clienteId, empresaId }) {
  // Abre uma transação para validar os bloqueios antes de remover qualquer dado.
  return prisma.$transaction(async (tx) => {
    // Busca somente o cliente do tipo correto dentro da empresa autenticada.
    const cliente = await tx.usuario.findFirst({
      where: { id: clienteId, empresaId, tipo: "CLIENTE" },
      select: { id: true, nome: true },
    });
    // Devolve 404 sem revelar perfis de outras empresas.
    if (!cliente) throw erroExclusao("CLIENTE_NAO_ENCONTRADO", "Cliente não encontrado", 404);

    // Carrega as obras vinculadas ao cliente e ao mesmo escopo empresarial.
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
    // Localiza contratos das obras sem carregar o conteúdo contratual.
    const contratos = obraIds.length ? await tx.contrato.findMany({
      where: { obraId: { in: obraIds } },
      select: { id: true, obraId: true },
    }) : [];
    // Reúne os identificadores de contratos para consultar aceites sem relação ambígua.
    const contratoIds = contratos.map((contrato) => contrato.id);
    // Procura aceites do cliente ou de qualquer cliente desses contratos.
    const aceites = await tx.contratoAceite.findMany({
      where: contratoIds.length ? { OR: [{ usuarioId: cliente.id }, { contratoId: { in: contratoIds } }] } : { usuarioId: cliente.id },
      select: { id: true, usuarioId: true, contratoId: true },
    });
    // Consulta eventos ligados às obras ou escritos pelo cliente em outra obra.
    const eventos = await tx.obraEvento.findMany({
      where: obraIds.length ? { OR: [{ obraId: { in: obraIds } }, { usuarioId: cliente.id }] } : { usuarioId: cliente.id },
      select: { id: true, obraId: true, usuarioId: true, tipo: true, descricao: true, visivelParaCliente: true },
    });
    // Bloqueia pagamentos confirmados, inclusive os confirmados antes de qualquer atualização de parcela.
    const pagamentoRealizado = pagamentos.some((pagamento) => pagamento.status === "APROVADO")
      || parcelas.some((parcela) => parcela.situacao === "PAGA" || Boolean(parcela.pagaEm))
      || eventos.some((evento) => evento.tipo === "PAGAMENTO");
    // Retorna o motivo de pagamento antes de apagar qualquer registro.
    if (pagamentoRealizado) throw erroExclusao("PAGAMENTO_REALIZADO", "Não é possível excluir o cliente: existe pagamento realizado.");

    // Identifica a primeira obra que deixou de estar Agendada.
    const obraIniciada = obras.find((obra) => obra.status !== "AGENDADA");
    // Retorna o nome e o estado que impedem a exclusão da obra.
    if (obraIniciada) throw erroExclusao("OBRA_INICIADA", `Não é possível excluir o cliente: a obra "${obraIniciada.nome}" está ${obraIniciada.status} e já saiu de Agendada.`);

    // Bloqueia aceites reais sem confundir anexos de contrato ainda não aceitos.
    if (aceites.length) throw erroExclusao("CONTRATO_ACEITO", "Não é possível excluir o cliente: existe contrato aceito.");

    // Encontra eventos que registram trabalho, andamento ou documentação real.
    const eventoHistorico = eventos.find(eventoHistoricoReal);
    // Retorna o tipo do registro de trabalho que precisa ser preservado.
    if (eventoHistorico) throw erroExclusao("HISTORICO_REAL", `Não é possível excluir o cliente: existe histórico real de obra (${eventoHistorico.tipo}).`);

    // Impede que uma tentativa financeira de outra obra perca a referência ao cliente.
    const pagamentoEmOutraObra = pagamentos.some((pagamento) => pagamento.obraId && !obraIds.includes(pagamento.obraId));
    // Explica que o pagamento segue ligado a uma obra que não será excluída.
    if (pagamentoEmOutraObra) throw erroExclusao("PAGAMENTO_EM_OUTRA_OBRA", "Não é possível excluir o cliente: há uma tentativa de pagamento vinculada a outra obra.");

    // Separa eventos automáticos do cliente que ficaram em obras anteriormente desvinculadas.
    const idsEventosAutomaticosDoCliente = eventos
      .filter((evento) => evento.usuarioId === cliente.id && eventoAutomatico(evento))
      .map((evento) => evento.id);
    // Apaga notificações pendentes endereçadas às obras que serão removidas.
    if (obraIds.length) await tx.notificacao.deleteMany({ where: { obraId: { in: obraIds } } });
    // Remove escalas ligadas às obras agendadas que serão apagadas.
    if (obraIds.length) await tx.obraEscala.deleteMany({ where: { obraId: { in: obraIds } } });
    // Remove disponibilidades que apontam para as obras excluídas.
    if (obraIds.length) await tx.disponibilidadeFuncionario.deleteMany({ where: { obraId: { in: obraIds } } });
    // Remove convites sem uso ligados a essas obras.
    if (obraIds.length) await tx.convite.deleteMany({ where: { obraId: { in: obraIds }, usadoEm: null } });
    // Preserva convites já aceitos, retirando apenas o vínculo com a obra excluída.
    if (obraIds.length) await tx.convite.updateMany({ where: { obraId: { in: obraIds }, usadoEm: { not: null } }, data: { obraId: null } });
    // Remove tentativas financeiras não aprovadas que dependem das obras excluídas.
    if (obraIds.length) await tx.pagamento.deleteMany({ where: { obraId: { in: obraIds } } });
    // Remove parcelas pendentes antes das obras para respeitar as chaves estrangeiras.
    if (obraIds.length) await tx.parcela.deleteMany({ where: { obraId: { in: obraIds } } });
    // Remove os contratos anexados que não têm aceite registrado.
    if (obraIds.length) await tx.contrato.deleteMany({ where: { obraId: { in: obraIds } } });
    // Remove somente os eventos automáticos do cliente em obras que ficarão preservadas.
    if (idsEventosAutomaticosDoCliente.length) await tx.obraEvento.deleteMany({ where: { id: { in: idsEventosAutomaticosDoCliente }, obraId: { notIn: obraIds } } });
    // Remove eventos e notificações restantes das obras agendadas excluídas.
    if (obraIds.length) await tx.obraEvento.deleteMany({ where: { obraId: { in: obraIds } } });
    // Exclui as obras somente se ainda pertencerem ao cliente e permanecerem Agendadas.
    const obrasExcluidas = obraIds.length ? await tx.obra.deleteMany({ where: { id: { in: obraIds }, empresaId, clienteId: cliente.id, status: "AGENDADA" } }) : { count: 0 };
    // Força rollback se uma obra mudou de estado ou vínculo durante a exclusão.
    if (obrasExcluidas.count !== obraIds.length) throw erroExclusao("CLIENTE_EXCLUSAO_CONCORRENTE", "Os dados do cliente mudaram durante a exclusão. Atualize a tela e tente novamente.");
    // Exclui o perfil por último, depois que suas obras e eventos automáticos foram tratados.
    await tx.usuario.delete({ where: { id: cliente.id } });
    // Retorna uma mensagem que explica que as obras agendadas foram removidas junto ao cliente.
    return { mensagem: "Cliente e obras agendadas excluídos." };
  }, { isolationLevel: "Serializable" });
}

// Exporta a regra para a rota e para testes isolados sem acessar banco compartilhado.
module.exports = { eventoAutomatico, eventoHistoricoReal, excluirClienteComObrasAgendadas };
