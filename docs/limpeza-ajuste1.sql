-- Inicia a conferência e a limpeza na mesma transação.
BEGIN;

-- Mantém a mesma visão dos registros até o COMMIT ou ROLLBACK.
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Captura somente as três obras com os nomes autorizados.
CREATE TEMP TABLE alvo_obras ON COMMIT DROP AS
SELECT id::text AS id, "empresaId" AS empresa_id, nome, status::text AS status, "clienteId" AS cliente_id
FROM "Obra"
WHERE nome IN ('teste2', 'teste', 'Teste');

-- Captura somente os três clientes com os nomes autorizados.
CREATE TEMP TABLE alvo_clientes ON COMMIT DROP AS
SELECT id::text AS id, "empresaId" AS empresa_id, nome, email
FROM "Usuario"
WHERE tipo = 'CLIENTE'
  AND nome IN ('Dona teste', 'aaaaaa', 'teste de cliente');

-- Captura somente o convite de gerente pendente com o nome informado.
CREATE TEMP TABLE alvo_convite ON COMMIT DROP AS
SELECT id::text AS id, "empresaId" AS empresa_id, nome, "obraId" AS obra_id, "expiraEm" AS expira_em
FROM "Convite"
WHERE tipo = 'GERENTE'
  AND nome = 'Anderson Ferreira'
  AND "usadoEm" IS NULL
  AND "expiraEm" > CURRENT_TIMESTAMP;

-- Captura somente a gerente ativa e o usuário associado, se houver.
CREATE TEMP TABLE alvo_gerente ON COMMIT DROP AS
SELECT f.id::text AS funcionario_id, f."empresaId" AS empresa_id, f.nome,
       f."usuarioId" AS usuario_id, u.email, u.tipo::text AS usuario_tipo
FROM "Funcionario" f
LEFT JOIN "Usuario" u ON u.id = f."usuarioId"
WHERE f.nome = 'Alexssandra Pereira'
  AND f.ativo = TRUE;

-- Mostra os registros exatos que seriam removidos antes de qualquer DELETE.
SELECT 'OBRA'::text AS tipo, id, empresa_id, nome, status AS situacao,
       COALESCE(cliente_id, '') AS referencia
FROM alvo_obras
UNION ALL
SELECT 'CLIENTE', id, empresa_id, nome, 'CLIENTE', email
FROM alvo_clientes
UNION ALL
SELECT 'CONVITE GERENTE', id, empresa_id, nome, 'PENDENTE', COALESCE(obra_id, '')
FROM alvo_convite
UNION ALL
SELECT 'GERENTE ATIVA', funcionario_id, empresa_id, nome, 'ATIVA',
       COALESCE(usuario_tipo, '') || ' / ' || COALESCE(usuario_id, '')
FROM alvo_gerente
ORDER BY tipo, nome, empresa_id;

-- Mostra a atribuição da Alexssandra à obra teste antes de remover o vínculo.
SELECT oe.id::text AS escala_id, f.nome AS gerente, o.nome AS obra,
       oe."dataInicio", oe."dataFim", oe.motivo
FROM "ObraEscala" oe
JOIN alvo_gerente ag ON ag.funcionario_id = oe."funcionarioId"
JOIN alvo_obras o ON o.id = oe."obraId"
JOIN "Funcionario" f ON f.id = oe."funcionarioId"
WHERE o.nome = 'teste';

-- Confere quantidades, empresa, estado e vínculos antes de iniciar a limpeza.
DO $validar_alvos$
DECLARE
  empresa_alvo TEXT;
BEGIN
  -- Exige exatamente as quantidades autorizadas pelo usuário.
  IF (SELECT COUNT(*) FROM alvo_obras) <> 3
     OR (SELECT COUNT(*) FROM alvo_clientes) <> 3
     OR (SELECT COUNT(*) FROM alvo_convite) <> 1
     OR (SELECT COUNT(*) FROM alvo_gerente) <> 1 THEN
    RAISE EXCEPTION 'Conferência cancelada: esperado 3 obras, 3 clientes, 1 convite e 1 gerente ativa.';
  END IF;

  -- Usa a empresa das obras como referência para impedir exclusão entre empresas.
  SELECT empresa_id INTO empresa_alvo FROM alvo_obras LIMIT 1;

  -- Exige que todos os registros selecionados pertençam à mesma empresa.
  IF EXISTS (SELECT 1 FROM alvo_obras WHERE empresa_id <> empresa_alvo)
     OR EXISTS (SELECT 1 FROM alvo_clientes WHERE empresa_id <> empresa_alvo)
     OR EXISTS (SELECT 1 FROM alvo_convite WHERE empresa_id <> empresa_alvo)
     OR EXISTS (SELECT 1 FROM alvo_gerente WHERE empresa_id <> empresa_alvo) THEN
    RAISE EXCEPTION 'Conferência cancelada: os nomes encontrados não pertencem à mesma empresa.';
  END IF;

  -- Evita apagar um perfil que não seja de colaborador/gerente.
  IF EXISTS (
    SELECT 1
    FROM alvo_gerente
    WHERE usuario_id IS NOT NULL
      AND usuario_tipo IS DISTINCT FROM 'COLABORADOR'
  ) THEN
    RAISE EXCEPTION 'Conferência cancelada: a conta vinculada à gerente não é do tipo COLABORADOR.';
  END IF;

  -- Exige que as três obras continuem Agendadas.
  IF EXISTS (SELECT 1 FROM alvo_obras WHERE status <> 'AGENDADA') THEN
    RAISE EXCEPTION 'Conferência cancelada: uma obra selecionada já foi iniciada.';
  END IF;

  -- Impede apagar um cliente que também esteja ligado a uma obra fora da lista autorizada.
  IF EXISTS (
    SELECT 1
    FROM "Obra" o
    JOIN alvo_clientes c ON c.id = o."clienteId"
    LEFT JOIN alvo_obras a ON a.id = o.id
    WHERE a.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Conferência cancelada: um cliente selecionado possui outra obra fora da lista.';
  END IF;

  -- Confirma que a atribuição informada da gerente à obra teste ainda existe.
  IF NOT EXISTS (
    SELECT 1
    FROM "ObraEscala" oe
    JOIN alvo_gerente g ON g.funcionario_id = oe."funcionarioId"
    JOIN alvo_obras o ON o.id = oe."obraId"
    WHERE o.nome = 'teste'
      AND oe."dataFim" IS NULL
  ) THEN
    RAISE EXCEPTION 'Conferência cancelada: a atribuição ativa da gerente à obra teste não foi encontrada.';
  END IF;

  -- Evita desvincular silenciosamente outro convite pendente da obra que será apagada.
  IF EXISTS (
    SELECT 1
    FROM "Convite" c
    JOIN alvo_obras o ON o.id = c."obraId"
    LEFT JOIN alvo_convite alvo ON alvo.id = c.id
    WHERE c."usadoEm" IS NULL
      AND alvo.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Conferência cancelada: existe outro convite sem uso ligado às obras selecionadas.';
  END IF;

  -- Impede remover qualquer pagamento confirmado ou parcela paga das obras e clientes.
  IF EXISTS (
    SELECT 1
    FROM "Pagamento" p
    WHERE p.status = 'APROVADO'
      AND (p."obraId" IN (SELECT id FROM alvo_obras)
           OR p."usuarioId" IN (SELECT id FROM alvo_clientes))
  ) OR EXISTS (
    SELECT 1
    FROM "Parcela" p
    WHERE p."obraId" IN (SELECT id FROM alvo_obras)
      AND (p.situacao = 'PAGA' OR p."pagaEm" IS NOT NULL)
  ) OR EXISTS (
    SELECT 1
    FROM "ObraEvento" e
    WHERE e.tipo = 'PAGAMENTO'
      AND (e."obraId" IN (SELECT id FROM alvo_obras)
           OR e."usuarioId" IN (SELECT id FROM alvo_clientes))
  ) THEN
    RAISE EXCEPTION 'Conferência cancelada: há pagamento realizado nos registros selecionados.';
  END IF;

  -- Impede apagar contratos aceitos pelo cliente ou ligados às obras selecionadas.
  IF EXISTS (
    SELECT 1
    FROM "ContratoAceite" ca
    LEFT JOIN "Contrato" c ON c.id = ca."contratoId"
    WHERE ca."usuarioId" IN (SELECT id FROM alvo_clientes)
       OR c."obraId" IN (SELECT id FROM alvo_obras)
  ) THEN
    RAISE EXCEPTION 'Conferência cancelada: existe contrato aceito nos registros selecionados.';
  END IF;

  -- Preserva eventos reais de trabalho e qualquer evento do gerente fora das obras selecionadas.
  IF EXISTS (
    SELECT 1
    FROM "ObraEvento" e
    WHERE (e."obraId" IN (SELECT id FROM alvo_obras)
           OR e."usuarioId" IN (SELECT id FROM alvo_clientes))
      AND e.tipo <> 'PAGAMENTO'
      AND NOT (
        e.tipo IN ('AGENDAMENTO', 'EQUIPE', 'CONTRATO')
        OR (e.tipo = 'STATUS' AND e.descricao IN ('Obra criada pela empreiteira.', 'Obra agendada arquivada pela empreiteira.'))
        OR (e.tipo = 'STATUS' AND e.descricao LIKE '%aceitou o convite de cliente e vinculou-se à obra.')
        OR (e.tipo = 'ANOTACAO' AND e.descricao = 'Dados básicos da obra atualizados pela empreiteira.')
        OR (e.tipo = 'ANOTACAO' AND e.descricao LIKE 'Vencimento das parcelas alterado de %')
      )
  ) THEN
    RAISE EXCEPTION 'Conferência cancelada: há histórico real de trabalho nos registros selecionados.';
  END IF;

  -- Não apaga tentativas financeiras que estejam associadas a outras obras dos clientes.
  IF EXISTS (
    SELECT 1
    FROM "Pagamento" p
    JOIN alvo_clientes c ON c.id = p."usuarioId"
    LEFT JOIN alvo_obras o ON o.id = p."obraId"
    WHERE o.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Conferência cancelada: há tentativa de pagamento do cliente em outra obra.';
  END IF;

  -- Não apaga escalas ou disponibilidades da gerente em obras fora da seleção.
  IF EXISTS (
    SELECT 1
    FROM "ObraEscala" oe
    JOIN alvo_gerente g ON g.funcionario_id = oe."funcionarioId"
    LEFT JOIN alvo_obras o ON o.id = oe."obraId"
    WHERE o.id IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM "DisponibilidadeFuncionario" d
    JOIN alvo_gerente g ON g.funcionario_id = d."funcionarioId"
    LEFT JOIN alvo_obras o ON o.id = d."obraId"
    WHERE o.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Conferência cancelada: a gerente possui vínculos com outras obras.';
  END IF;

  -- Preserva referências históricas da gerente que não pertencem às obras selecionadas.
  IF EXISTS (
    SELECT 1
    FROM "ObraEvento" e
    JOIN alvo_gerente g ON g.usuario_id = e."usuarioId"
    LEFT JOIN alvo_obras o ON o.id = e."obraId"
    WHERE o.id IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM "ObraEscala" oe
    JOIN alvo_gerente g ON g.usuario_id = oe."alteradoPorId"
    LEFT JOIN alvo_obras o ON o.id = oe."obraId"
    WHERE o.id IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM "Convite" c
    JOIN alvo_gerente g ON g.usuario_id = c."criadoPorId"
  ) OR EXISTS (
    SELECT 1
    FROM "Pagamento" p
    JOIN alvo_gerente g ON g.usuario_id = p."usuarioId"
  ) OR EXISTS (
    SELECT 1
    FROM "ContratoAceite" ca
    JOIN alvo_gerente g ON g.usuario_id = ca."usuarioId"
  ) THEN
    RAISE EXCEPTION 'Conferência cancelada: a gerente possui histórico ou vínculos fora das obras selecionadas.';
  END IF;
END;
$validar_alvos$;

-- Remove notificações que apontam para as obras e evita avisos sobre dados excluídos.
DELETE FROM "Notificacao"
WHERE "obraId" IN (SELECT id FROM alvo_obras);

-- Remove a atribuição da Alexssandra à obra teste antes de apagar o cadastro da gerente.
DELETE FROM "ObraEscala"
WHERE "obraId" IN (SELECT id FROM alvo_obras);

-- Remove disponibilidades ligadas exclusivamente às obras que serão apagadas.
DELETE FROM "DisponibilidadeFuncionario"
WHERE "obraId" IN (SELECT id FROM alvo_obras);

-- Exclui somente o convite pendente de gerente que foi nomeado.
DELETE FROM "Convite"
WHERE id IN (SELECT id FROM alvo_convite);

-- Preserva outros convites e remove apenas a referência à obra que será apagada.
UPDATE "Convite"
SET "obraId" = NULL
WHERE "obraId" IN (SELECT id FROM alvo_obras);

-- Remove tentativas financeiras ainda não aprovadas que dependem das obras selecionadas.
DELETE FROM "Pagamento"
WHERE "obraId" IN (SELECT id FROM alvo_obras);

-- Remove parcelas pendentes depois de remover as tentativas que apontam para elas.
DELETE FROM "Parcela"
WHERE "obraId" IN (SELECT id FROM alvo_obras);

-- Remove contratos sem aceite das obras selecionadas.
DELETE FROM "Contrato"
WHERE "obraId" IN (SELECT id FROM alvo_obras);

-- Remove eventos automáticos de vínculo dos clientes que estejam em outras obras.
DELETE FROM "ObraEvento" e
USING alvo_clientes c
WHERE e."usuarioId" = c.id
  AND e."obraId" NOT IN (SELECT id FROM alvo_obras)
  AND e.tipo = 'STATUS'
  AND e.descricao LIKE '%aceitou o convite de cliente e vinculou-se à obra.';

-- Remove eventos e demais notificações ligados às três obras autorizadas.
DELETE FROM "ObraEvento"
WHERE "obraId" IN (SELECT id FROM alvo_obras);

-- Apaga as três obras somente se ainda estiverem Agendadas e na empresa conferida.
DO $excluir_obras$
DECLARE
  removidas INTEGER;
BEGIN
  DELETE FROM "Obra"
  WHERE id IN (SELECT id FROM alvo_obras)
    AND "empresaId" = (SELECT empresa_id FROM alvo_obras LIMIT 1)
    AND status = 'AGENDADA';
  GET DIAGNOSTICS removidas = ROW_COUNT;
  IF removidas <> 3 THEN
    RAISE EXCEPTION 'Limpeza cancelada: o número de obras removidas não corresponde a 3.';
  END IF;
END;
$excluir_obras$;

-- Apaga os três perfis de cliente informados depois de remover suas obras.
DO $excluir_clientes$
DECLARE
  removidos INTEGER;
BEGIN
  DELETE FROM "Usuario"
  WHERE id IN (SELECT id FROM alvo_clientes)
    AND tipo = 'CLIENTE'
    AND "empresaId" = (SELECT empresa_id FROM alvo_obras LIMIT 1);
  GET DIAGNOSTICS removidos = ROW_COUNT;
  IF removidos <> 3 THEN
    RAISE EXCEPTION 'Limpeza cancelada: o número de clientes removidos não corresponde a 3.';
  END IF;
END;
$excluir_clientes$;

-- Apaga somente o cadastro ativo da gerente conferida depois de remover suas escalas.
DO $excluir_gerente$
DECLARE
  removidas INTEGER;
BEGIN
  DELETE FROM "Funcionario"
  WHERE id IN (SELECT funcionario_id FROM alvo_gerente)
    AND ativo = TRUE
    AND "empresaId" = (SELECT empresa_id FROM alvo_obras LIMIT 1);
  GET DIAGNOSTICS removidas = ROW_COUNT;
  IF removidas <> 1 THEN
    RAISE EXCEPTION 'Limpeza cancelada: o número de gerentes removidas não corresponde a 1.';
  END IF;
END;
$excluir_gerente$;

-- Apaga a conta da gerente somente se ela estiver vinculada ao cadastro selecionado.
DELETE FROM "Usuario"
WHERE id IN (SELECT usuario_id FROM alvo_gerente WHERE usuario_id IS NOT NULL)
  AND "empresaId" = (SELECT empresa_id FROM alvo_obras LIMIT 1);

-- Confirma todas as exclusões em conjunto; qualquer exceção anterior reverte a transação.
COMMIT;
