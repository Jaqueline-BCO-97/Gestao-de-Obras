-- Lista os perfis que não estão na lista demo autorizada, sem alterar registros.
-- Execute esta consulta antes do script de limpeza e revise os vínculos exibidos.
SELECT
  -- Mostra o identificador do perfil para conferência no painel do banco.
  usuario."id",
  -- Mostra o nome cadastrado do perfil.
  usuario."nome",
  -- Mostra o e-mail que será comparado com a lista demo.
  usuario."email",
  -- Mostra o tipo atual do perfil.
  usuario."tipo",
  -- Mostra a empresa vinculada ao perfil.
  usuario."empresaId",
  -- Conta obras que usam o perfil como cliente.
  obras_cliente.quantidade AS "obrasComoCliente",
  -- Conta cadastros profissionais ligados ao perfil.
  funcionarios.quantidade AS "cadastrosFuncionario",
  -- Conta alterações de escala atribuídas ao perfil.
  escalas_alteradas.quantidade AS "escalasAlteradas",
  -- Conta eventos de obra registrados pelo perfil.
  eventos.quantidade AS "eventosRegistrados",
  -- Conta convites criados pelo perfil.
  convites.quantidade AS "convitesCriados",
  -- Conta pagamentos iniciados pelo perfil.
  pagamentos.quantidade AS "pagamentosIniciados",
  -- Conta notificações endereçadas ao perfil.
  notificacoes.quantidade AS "notificacoes",
  -- Conta aceites de contrato registrados pelo perfil.
  aceites.quantidade AS "aceitesContrato",
  -- Indica quais perfis não têm vínculos conhecidos e podem ser removidos pelo script.
  CASE
    WHEN obras_cliente.quantidade + funcionarios.quantidade + escalas_alteradas.quantidade + eventos.quantidade + convites.quantidade + pagamentos.quantidade + notificacoes.quantidade + aceites.quantidade = 0
      THEN 'SEM VINCULOS CONHECIDOS: elegivel para limpeza'
    ELSE 'COM VINCULOS: sera preservado pelo script de limpeza'
  END AS "resultadoDaConferencia"
-- Seleciona todos os usuários que não correspondem a um dos cinco perfis permitidos.
FROM "Usuario" AS usuario
-- Conta as obras associadas ao usuário como cliente.
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INTEGER AS quantidade
  FROM "Obra"
  WHERE "clienteId" = usuario."id"
) AS obras_cliente ON TRUE
-- Conta os cadastros de funcionário associados ao usuário.
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INTEGER AS quantidade
  FROM "Funcionario"
  WHERE "usuarioId" = usuario."id"
) AS funcionarios ON TRUE
-- Conta os registros de escala alterados pelo usuário.
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INTEGER AS quantidade
  FROM "ObraEscala"
  WHERE "alteradoPorId" = usuario."id"
) AS escalas_alteradas ON TRUE
-- Conta os eventos de obra criados pelo usuário.
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INTEGER AS quantidade
  FROM "ObraEvento"
  WHERE "usuarioId" = usuario."id"
) AS eventos ON TRUE
-- Conta os convites criados pelo usuário.
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INTEGER AS quantidade
  FROM "Convite"
  WHERE "criadoPorId" = usuario."id"
) AS convites ON TRUE
-- Conta os pagamentos iniciados pelo usuário.
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INTEGER AS quantidade
  FROM "Pagamento"
  WHERE "usuarioId" = usuario."id"
) AS pagamentos ON TRUE
-- Conta as notificações endereçadas ao usuário.
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INTEGER AS quantidade
  FROM "Notificacao"
  WHERE "usuarioId" = usuario."id"
) AS notificacoes ON TRUE
-- Conta os aceites de contrato registrados pelo usuário.
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INTEGER AS quantidade
  FROM "ContratoAceite"
  WHERE "usuarioId" = usuario."id"
) AS aceites ON TRUE
-- Mantém somente os perfis diferentes dos cinco e-mails e tipos autorizados.
WHERE NOT (
  (usuario."tipo" = 'ADMIN'::"TipoUsuario" AND LOWER(BTRIM(usuario."email")) = 'admin@obramaster.demo')
  OR (usuario."tipo" = 'CLIENTE'::"TipoUsuario" AND LOWER(BTRIM(usuario."email")) = 'cliente@obramaster.demo')
  OR (usuario."tipo" = 'COLABORADOR'::"TipoUsuario" AND LOWER(BTRIM(usuario."email")) IN (
    'colaborador@obramaster.demo',
    'colaborador2@obramaster.demo',
    'colaborador3@obramaster.demo'
  ))
)
-- Ordena por tipo e e-mail para facilitar a revisão dos resultados.
ORDER BY usuario."tipo", usuario."email";
