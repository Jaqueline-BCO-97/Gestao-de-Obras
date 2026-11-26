-- Confere somente os registros exatos antes de executar a limpeza transacional.
SELECT 'OBRA'::text AS tipo, o.id::text AS id, o."empresaId"::text AS empresa_id,
       o.nome::text AS nome, o.status::text AS situacao, COALESCE(o."clienteId"::text, '') AS referencia
FROM "Obra" o
WHERE o.nome IN ('teste2', 'teste', 'Teste')
UNION ALL
SELECT 'CLIENTE', u.id::text, u."empresaId"::text, u.nome::text, u.tipo::text, u.email::text
FROM "Usuario" u
WHERE u.tipo = 'CLIENTE'
  AND u.nome IN ('Dona teste', 'aaaaaa', 'teste de cliente')
UNION ALL
SELECT 'CONVITE GERENTE', c.id::text, c."empresaId"::text, c.nome::text, 'PENDENTE', COALESCE(c."obraId"::text, '')
FROM "Convite" c
WHERE c.tipo = 'GERENTE'
  AND c.nome = 'Anderson Ferreira'
  AND c."usadoEm" IS NULL
  AND c."expiraEm" > CURRENT_TIMESTAMP
UNION ALL
SELECT 'GERENTE ATIVA', f.id::text, f."empresaId"::text, f.nome::text,
       CASE WHEN f.ativo THEN 'ATIVA' ELSE 'INATIVA' END, COALESCE(f."usuarioId"::text, '')
FROM "Funcionario" f
WHERE f.nome = 'Alexssandra Pereira'
  AND f.ativo = TRUE
ORDER BY tipo, nome, empresa_id;

-- Confere a escala ativa da Alexssandra vinculada à obra teste.
SELECT oe.id::text AS escala_id, f.nome AS gerente, o.nome AS obra,
       oe."dataInicio", oe."dataFim", oe.motivo
FROM "ObraEscala" oe
JOIN "Funcionario" f ON f.id = oe."funcionarioId"
JOIN "Obra" o ON o.id = oe."obraId"
WHERE f.nome = 'Alexssandra Pereira'
  AND f.ativo = TRUE
  AND o.nome = 'teste'
  AND oe."dataFim" IS NULL;
