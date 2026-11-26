// Resolve o caminho absoluto do .env do backend para funcionar de qualquer diretório.
const path = require("node:path");
// Carrega as variáveis do arquivo .env do backend sem gravar nem exibir segredos.
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
// Importa a conexão Prisma do backend e a classificação de eventos automáticos.
const { getPrisma } = require("../src/config/db");
const { eventoHistoricoReal } = require("../src/services/excluirCliente");

// Lista exata das obras de teste autorizadas para limpeza.
const NOMES_OBRAS_ALVO = ["teste2", "teste", "Teste"];
// Lista exata dos clientes de teste autorizados para limpeza.
const NOMES_CLIENTES_ALVO = ["aaaaaa", "Dona teste", "teste de cliente"];
// Lista exata dos gerentes de teste autorizados para limpeza.
const NOMES_GERENTES_ALVO = ["Alexssandra Pereira", "Anderson Ferreiro"];

// Busca registros por nome exato e aborta imediatamente se encontrar duplicidade.
function exigirRegistroUnicoPorNome(lista, nome, rotulo) {
  // Filtra exatamente pelo nome esperado para evitar deleções amplas.
  const encontrados = lista.filter((item) => item.nome === nome);
  // Aborta caso existam dois ou mais registros com o mesmo nome exato.
  if (encontrados.length > 1) {
    throw new Error(`Abortado: foram encontrados ${encontrados.length} registros para ${rotulo} "${nome}".`);
  }
  // Devolve o registro único ou null quando já tiver sido removido (idempotência).
  return encontrados[0] || null;
}

// Inspeciona o banco em modo somente leitura e monta o plano seguro de exclusão.
async function montarPlanoLimpeza(prisma) {
  // Consulta todas as entidades-alvo por nome exato e tipo esperado.
  const [obrasBrutas, clientesBrutos, funcionariosBrutos, usuariosGerentesBrutos, convitesGerenteBrutos] = await Promise.all([
    prisma.obra.findMany({
      where: { nome: { in: NOMES_OBRAS_ALVO } },
      select: { id: true, empresaId: true, nome: true, status: true, clienteId: true },
    }),
    prisma.usuario.findMany({
      where: { tipo: "CLIENTE", nome: { in: NOMES_CLIENTES_ALVO } },
      select: { id: true, empresaId: true, nome: true, email: true, tipo: true },
    }),
    prisma.funcionario.findMany({
      where: { nome: { in: NOMES_GERENTES_ALVO } },
      select: { id: true, empresaId: true, nome: true, usuarioId: true },
    }),
    prisma.usuario.findMany({
      where: { tipo: "COLABORADOR", nome: { in: NOMES_GERENTES_ALVO } },
      select: { id: true, empresaId: true, nome: true, tipo: true },
    }),
    prisma.convite.findMany({
      where: { tipo: "GERENTE", nome: "Anderson Ferreiro", usadoEm: null },
      select: { id: true, empresaId: true, nome: true, obraId: true },
    }),
  ]);

  // Garante no máximo um registro por nome exato em cada lista autorizada.
  const obras = NOMES_OBRAS_ALVO.map((nome) => exigirRegistroUnicoPorNome(obrasBrutas, nome, "obra")).filter(Boolean);
  const clientes = NOMES_CLIENTES_ALVO.map((nome) => exigirRegistroUnicoPorNome(clientesBrutos, nome, "cliente")).filter(Boolean);
  const funcionarios = NOMES_GERENTES_ALVO.map((nome) => exigirRegistroUnicoPorNome(funcionariosBrutos, nome, "funcionário gerente")).filter(Boolean);
  const usuariosGerentesNome = NOMES_GERENTES_ALVO.map((nome) => exigirRegistroUnicoPorNome(usuariosGerentesBrutos, nome, "usuário gerente")).filter(Boolean);

  // Aborta se houver mais de um convite pendente para Anderson Ferreiro.
  if (convitesGerenteBrutos.length > 1) {
    throw new Error(`Abortado: foram encontrados ${convitesGerenteBrutos.length} convites pendentes para o gerente "Anderson Ferreiro".`);
  }
  const convitesGerente = convitesGerenteBrutos;

  // Reúne todos os usuários de gerentes (via Funcionario.usuarioId ou por nome exato de COLABORADOR).
  const idsUsuariosGerentes = Array.from(new Set([
    ...funcionarios.map((item) => item.usuarioId).filter(Boolean),
    ...usuariosGerentesNome.map((item) => item.id),
  ]));
  const usuariosGerentes = idsUsuariosGerentes.length
    ? await prisma.usuario.findMany({
      where: { id: { in: idsUsuariosGerentes } },
      select: { id: true, empresaId: true, nome: true, tipo: true },
    })
    : [];

  // Garante que qualquer usuário vinculado a gerente tenha papel COLABORADOR.
  for (const usuarioGerente of usuariosGerentes) {
    if (usuarioGerente.tipo !== "COLABORADOR") {
      throw new Error(`Abortado: a conta ligada ao gerente "${usuarioGerente.nome}" não tem papel COLABORADOR.`);
    }
  }

  // Valida que todos os registros encontrados pertencem à mesma empresa.
  const empresasEncontradas = Array.from(new Set([
    ...obras.map((item) => item.empresaId),
    ...clientes.map((item) => item.empresaId),
    ...funcionarios.map((item) => item.empresaId),
    ...usuariosGerentes.map((item) => item.empresaId),
    ...convitesGerente.map((item) => item.empresaId),
  ]));
  if (empresasEncontradas.length > 1) {
    throw new Error("Abortado: os registros de teste encontrados pertencem a mais de uma empresa.");
  }

  // Coleta os identificadores internos apenas em memória (nunca impressos no terminal).
  const obraIds = obras.map((obra) => obra.id);
  const clienteIds = clientes.map((cliente) => cliente.id);
  const funcionarioIds = funcionarios.map((funcionario) => funcionario.id);
  const conviteGerenteIds = convitesGerente.map((convite) => convite.id);

  // Aborta imediatamente se alguma obra selecionada não estiver no status Agendada.
  const obraNaoAgendada = obras.find((obra) => obra.status !== "AGENDADA");
  if (obraNaoAgendada) {
    throw new Error(`Abortado: a obra "${obraNaoAgendada.nome}" está com status ${obraNaoAgendada.status} (esperado AGENDADA).`);
  }

  // Confere que nenhuma das obras possui parcela paga, pagamento aprovado ou evento financeiro.
  if (obraIds.length) {
    const [parcelasPagas, pagamentosAprovados, eventosObra, contratosAceitos] = await Promise.all([
      prisma.parcela.count({ where: { obraId: { in: obraIds }, OR: [{ situacao: "PAGA" }, { pagaEm: { not: null } }] } }),
      prisma.pagamento.count({ where: { obraId: { in: obraIds }, status: "APROVADO" } }),
      prisma.obraEvento.findMany({
        where: { obraId: { in: obraIds } },
        select: { id: true, tipo: true, descricao: true },
      }),
      prisma.contratoAceite.count({ where: { contrato: { obraId: { in: obraIds } } } }),
    ]);
    if (parcelasPagas > 0 || pagamentosAprovados > 0) {
      throw new Error("Abortado: existe parcela paga ou pagamento aprovado nas obras selecionadas.");
    }
    if (contratosAceitos > 0) {
      throw new Error("Abortado: existe aceite de contrato registrado nas obras selecionadas.");
    }
    // Permite eventos administrativos e FOTO inicial; aborta se houver pagamento ou andamento real.
    const eventoImpeditivo = eventosObra.find((evento) => evento.tipo === "PAGAMENTO" || eventoHistoricoReal(evento));
    if (eventoImpeditivo) {
      throw new Error(`Abortado: existe evento impeditivo do tipo ${eventoImpeditivo.tipo} nas obras selecionadas.`);
    }
  }

  // Valida que os clientes selecionados não têm obras ou vínculos fora das obras apagadas.
  const clientesElegiveisParaRemocao = [];
  const clientesPreservados = [];
  for (const cliente of clientes) {
    // Verifica se existem obras desse cliente que não estão na lista autorizada.
    const obrasFora = await prisma.obra.count({
      where: { clienteId: cliente.id, ...(obraIds.length ? { id: { notIn: obraIds } } : {}) },
    });
    if (obrasFora > 0) {
      throw new Error(`Abortado: o cliente "${cliente.nome}" está vinculado a ${obrasFora} outra(s) obra(s) fora da lista.`);
    }
    // Verifica origem via convite aceito e ausência de vínculos fora das obras apagadas.
    const [conviteAceito, pagamentosFora, aceitesFora, eventosFora, funcionarioVinculado, escalasAlteradas, convitesCriados] = await Promise.all([
      prisma.convite.findFirst({
        where: {
          empresaId: cliente.empresaId,
          tipo: "CLIENTE",
          usadoEm: { not: null },
          OR: [{ email: cliente.email }, ...(obraIds.length ? [{ obraId: { in: obraIds } }] : [])],
        },
        select: { id: true },
      }),
      prisma.pagamento.count({
        where: { usuarioId: cliente.id, ...(obraIds.length ? { obraId: { notIn: obraIds } } : {}) },
      }),
      prisma.contratoAceite.count({
        where: { usuarioId: cliente.id, ...(obraIds.length ? { contrato: { obraId: { notIn: obraIds } } } : {}) },
      }),
      prisma.obraEvento.count({
        where: { usuarioId: cliente.id, ...(obraIds.length ? { obraId: { notIn: obraIds } } : {}) },
      }),
      prisma.funcionario.count({ where: { usuarioId: cliente.id } }),
      prisma.obraEscala.count({
        where: { alteradoPorId: cliente.id, ...(obraIds.length ? { obraId: { notIn: obraIds } } : {}) },
      }),
      prisma.convite.count({ where: { criadoPorId: cliente.id } }),
    ]);

    // Só remove a conta Usuario se for papel CLIENTE, criada por convite e sem vínculos externos.
    const semVinculosExternos = pagamentosFora === 0
      && aceitesFora === 0
      && eventosFora === 0
      && funcionarioVinculado === 0
      && escalasAlteradas === 0
      && convitesCriados === 0;
    if (cliente.tipo === "CLIENTE" && conviteAceito && semVinculosExternos) {
      clientesElegiveisParaRemocao.push(cliente);
    } else {
      clientesPreservados.push(cliente.nome);
    }
  }

  // Verifica se algum dos gerentes tem escalas ou disponibilidades em OUTRAS obras (aceita escalas encerradas na obra "teste").
  if (funcionarioIds.length) {
    const [escalasEmOutrasObras, disponibilidadesEmOutrasObras] = await Promise.all([
      prisma.obraEscala.count({
        where: { funcionarioId: { in: funcionarioIds }, ...(obraIds.length ? { obraId: { notIn: obraIds } } : {}) },
      }),
      prisma.disponibilidadeFuncionario.count({
        where: { funcionarioId: { in: funcionarioIds }, ...(obraIds.length ? { obraId: { notIn: obraIds } } : {}) },
      }),
    ]);
    if (escalasEmOutrasObras > 0 || disponibilidadesEmOutrasObras > 0) {
      throw new Error("Abortado: há escala ou disponibilidade de gerente em outra(s) obra(s) fora da lista.");
    }
  }

  // Verifica todas as FKs do Usuario dos gerentes em outras obras ou tabelas.
  if (idsUsuariosGerentes.length) {
    const [eventosEmOutrasObras, escalasAlteradasOutrasObras, convitesCriadosGerentes, pagamentosGerentes, aceitesGerentes] = await Promise.all([
      prisma.obraEvento.count({
        where: { usuarioId: { in: idsUsuariosGerentes }, ...(obraIds.length ? { obraId: { notIn: obraIds } } : {}) },
      }),
      prisma.obraEscala.count({
        where: { alteradoPorId: { in: idsUsuariosGerentes }, ...(obraIds.length ? { obraId: { notIn: obraIds } } : {}) },
      }),
      prisma.convite.count({ where: { criadoPorId: { in: idsUsuariosGerentes } } }),
      prisma.pagamento.count({ where: { usuarioId: { in: idsUsuariosGerentes } } }),
      prisma.contratoAceite.count({ where: { usuarioId: { in: idsUsuariosGerentes } } }),
    ]);
    if (
      eventosEmOutrasObras > 0
      || escalasAlteradasOutrasObras > 0
      || convitesCriadosGerentes > 0
      || pagamentosGerentes > 0
      || aceitesGerentes > 0
    ) {
      throw new Error("Abortado: algum gerente criou eventos, escalas, convites ou registros em outras obras.");
    }
  }

  // Calcula as contagens exatas por tabela para o resumo em dry-run e confirmação.
  const idsUsuariosClientesARemover = clientesElegiveisParaRemocao.map((item) => item.id);
  const idsUsuariosTotaisARemover = [...idsUsuariosClientesARemover, ...idsUsuariosGerentes];

  const [
    notificacoesAlvo,
    escalasAlvo,
    disponibilidadesAlvo,
    convitesPendentesObra,
    convitesAceitosDesvincular,
    pagamentosObra,
    parcelasObra,
    contratosObra,
    eventosObra,
  ] = await Promise.all([
    obraIds.length || idsUsuariosTotaisARemover.length
      ? prisma.notificacao.count({
        where: {
          OR: [
            ...(obraIds.length ? [{ obraId: { in: obraIds } }] : []),
            ...(idsUsuariosTotaisARemover.length ? [{ usuarioId: { in: idsUsuariosTotaisARemover } }] : []),
          ],
        },
      })
      : 0,
    obraIds.length || funcionarioIds.length
      ? prisma.obraEscala.count({
        where: {
          OR: [
            ...(obraIds.length ? [{ obraId: { in: obraIds } }] : []),
            ...(funcionarioIds.length ? [{ funcionarioId: { in: funcionarioIds } }] : []),
          ],
        },
      })
      : 0,
    obraIds.length || funcionarioIds.length
      ? prisma.disponibilidadeFuncionario.count({
        where: {
          OR: [
            ...(obraIds.length ? [{ obraId: { in: obraIds } }] : []),
            ...(funcionarioIds.length ? [{ funcionarioId: { in: funcionarioIds } }] : []),
          ],
        },
      })
      : 0,
    obraIds.length
      ? prisma.convite.count({
        where: {
          obraId: { in: obraIds },
          usadoEm: null,
          ...(conviteGerenteIds.length ? { id: { notIn: conviteGerenteIds } } : {}),
        },
      })
      : 0,
    obraIds.length ? prisma.convite.count({ where: { obraId: { in: obraIds }, usadoEm: { not: null } } }) : 0,
    obraIds.length ? prisma.pagamento.count({ where: { obraId: { in: obraIds } } }) : 0,
    obraIds.length ? prisma.parcela.count({ where: { obraId: { in: obraIds } } }) : 0,
    obraIds.length ? prisma.contrato.count({ where: { obraId: { in: obraIds } } }) : 0,
    obraIds.length || idsUsuariosTotaisARemover.length
      ? prisma.obraEvento.count({
        where: {
          OR: [
            ...(obraIds.length ? [{ obraId: { in: obraIds } }] : []),
            ...(idsUsuariosTotaisARemover.length ? [{ usuarioId: { in: idsUsuariosTotaisARemover } }] : []),
          ],
        },
      })
      : 0,
  ]);

  // Devolve o plano completo sem expor e-mails, telefones ou IDs reais.
  return {
    alvos: {
      obras: obras.map((obra) => ({ nome: obra.nome, status: obra.status })),
      clientesRemovidos: clientesElegiveisParaRemocao.map((cliente) => cliente.nome),
      clientesPreservados,
      gerentesFuncionarios: funcionarios.map((funcionario) => funcionario.nome),
      gerentesUsuarios: usuariosGerentes.map((usuario) => usuario.nome),
      convitesGerente: convitesGerente.map((convite) => convite.nome),
    },
    ids: {
      obraIds,
      clienteIds: idsUsuariosClientesARemover,
      funcionarioIds,
      usuarioGerenteIds: idsUsuariosGerentes,
      conviteGerenteIds,
    },
    contagens: {
      Notificacao: notificacoesAlvo,
      ObraEscala: escalasAlvo,
      DisponibilidadeFuncionario: disponibilidadesAlvo,
      ConviteExcluido: convitesGerente.length + convitesPendentesObra,
      ConviteDesvinculado: convitesAceitosDesvincular,
      Pagamento: pagamentosObra,
      Parcela: parcelasObra,
      Contrato: contratosObra,
      ObraEvento: eventosObra,
      Obra: obras.length,
      Funcionario: funcionarios.length,
      UsuarioCliente: idsUsuariosClientesARemover.length,
      UsuarioGerente: idsUsuariosGerentes.length,
    },
  };
}

// Executa todas as exclusões do plano em uma única transação atômica.
async function executarPlanoLimpeza(prisma, plano) {
  const { obraIds, clienteIds, funcionarioIds, usuarioGerenteIds, conviteGerenteIds } = plano.ids;
  const usuariosTotais = [...clienteIds, ...usuarioGerenteIds];

  // Se não há nada para remover, encerra de forma idempotente sem abrir escrita.
  const totalAlvos = obraIds.length + clienteIds.length + funcionarioIds.length + usuarioGerenteIds.length + conviteGerenteIds.length;
  if (totalAlvos === 0) return { removido: false, contagens: plano.contagens };

  return prisma.$transaction(async (tx) => {
    // 1. Remove notificações ligadas às obras ou aos usuários removidos.
    if (obraIds.length) await tx.notificacao.deleteMany({ where: { obraId: { in: obraIds } } });
    if (usuariosTotais.length) await tx.notificacao.deleteMany({ where: { usuarioId: { in: usuariosTotais } } });

    // 2. Remove escalas (inclusive encerradas) e disponibilidades ligadas às obras/funcionários.
    if (obraIds.length) await tx.obraEscala.deleteMany({ where: { obraId: { in: obraIds } } });
    if (funcionarioIds.length) await tx.obraEscala.deleteMany({ where: { funcionarioId: { in: funcionarioIds } } });
    if (obraIds.length) await tx.disponibilidadeFuncionario.deleteMany({ where: { obraId: { in: obraIds } } });
    if (funcionarioIds.length) await tx.disponibilidadeFuncionario.deleteMany({ where: { funcionarioId: { in: funcionarioIds } } });

    // 3. Remove o convite pendente nomeado e outros convites pendentes das obras; desvincula aceitos.
    if (conviteGerenteIds.length) await tx.convite.deleteMany({ where: { id: { in: conviteGerenteIds } } });
    if (obraIds.length) await tx.convite.deleteMany({ where: { obraId: { in: obraIds }, usadoEm: null } });
    if (obraIds.length) await tx.convite.updateMany({ where: { obraId: { in: obraIds }, usadoEm: { not: null } }, data: { obraId: null } });

    // 4. Remove pagamentos não aprovados, parcelas pendentes, contratos e eventos das obras/usuários.
    if (obraIds.length) await tx.pagamento.deleteMany({ where: { obraId: { in: obraIds } } });
    if (obraIds.length) await tx.parcela.deleteMany({ where: { obraId: { in: obraIds } } });
    if (obraIds.length) await tx.contrato.deleteMany({ where: { obraId: { in: obraIds } } });
    if (obraIds.length) await tx.obraEvento.deleteMany({ where: { obraId: { in: obraIds } } });
    if (usuariosTotais.length) await tx.obraEvento.deleteMany({ where: { usuarioId: { in: usuariosTotais } } });

    // 5. Remove as obras agendadas na ordem após limpar todas as dependências.
    if (obraIds.length) await tx.obra.deleteMany({ where: { id: { in: obraIds }, status: "AGENDADA" } });

    // 6. Remove os cadastros de Funcionario dos gerentes antes das contas Usuario.
    if (funcionarioIds.length) await tx.funcionario.deleteMany({ where: { id: { in: funcionarioIds } } });

    // 7. Remove as contas Usuario elegíveis (clientes criados por convite sem vínculos externos e gerentes).
    if (usuariosTotais.length) await tx.usuario.deleteMany({ where: { id: { in: usuariosTotais } } });

    return { removido: true, contagens: plano.contagens };
  }, { isolationLevel: "Serializable" });
}

// Executa o script via CLI em modo DRY-RUN por padrão ou aplica com --confirmar.
async function main(argv = process.argv.slice(2)) {
  const confirmar = argv.includes("--confirmar");
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error("DATABASE_URL não configurada no .env local.");
  }

  try {
    // Monta e valida todo o plano antes de qualquer operação.
    const plano = await montarPlanoLimpeza(prisma);
    console.log(`Modo: ${confirmar ? "CONFIRMAR (execução real)" : "DRY-RUN (somente leitura)"}`);
    console.log("Resumo por tabela (contagens):", JSON.stringify(plano.contagens, null, 2));
    console.log("Alvos conferidos (nomes e tipos):", JSON.stringify({
      obras: plano.alvos.obras.length,
      clientesARemover: plano.alvos.clientesRemovidos.length,
      clientesPreservados: plano.alvos.clientesPreservados.length,
      funcionariosGerentes: plano.alvos.gerentesFuncionarios.length,
      usuariosGerentes: plano.alvos.gerentesUsuarios.length,
      convitesGerente: plano.alvos.convitesGerente.length,
    }));

    if (plano.alvos.clientesPreservados.length) {
      console.log(`Aviso: ${plano.alvos.clientesPreservados.length} conta(s) de cliente serão preservadas por não serem de convite ou terem outros vínculos.`);
    }

    if (!confirmar) {
      console.log("Dry-run concluído. Nenhum registro foi alterado.");
      return;
    }

    const resultado = await executarPlanoLimpeza(prisma, plano);
    if (!resultado.removido) {
      console.log("Nenhum dado de teste pendente para exclusão (idempotente).");
      return;
    }
    console.log("Limpeza concluída com sucesso em transação única.");
  } finally {
    await prisma.$disconnect();
  }
}

// Só executa o CLI quando chamado diretamente pelo Node.
if (require.main === module) {
  main().catch((erro) => {
    console.error("Erro na limpeza de dados de teste:", erro.message);
    process.exit(1);
  });
}

module.exports = { montarPlanoLimpeza, executarPlanoLimpeza, main };
