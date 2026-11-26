-- Mantém todas as mudanças das contas demo na mesma transação.
BEGIN;

-- Valida a empresa de demonstração e recusa contas novas já escaladas.
DO $$
DECLARE
  -- Guarda a empresa atualmente vinculada ao gerente demo existente.
  empresa_demo_id TEXT;
BEGIN
  -- Exige o gerente demo atual para obter a empresa e o hash bcrypt existente.
  SELECT usuario."empresaId"
  INTO empresa_demo_id
  FROM "Usuario" AS usuario
  WHERE usuario."email" = 'colaborador@obramaster.demo'
    AND usuario."tipo" = 'COLABORADOR'::"TipoUsuario";
  IF empresa_demo_id IS NULL THEN
    RAISE EXCEPTION 'A conta gerente demo atual não foi encontrada como COLABORADOR.';
  END IF;

  -- Limita a alteração à empresa demo antiga ou à empresa já renomeada.
  IF NOT EXISTS (
    SELECT 1
    FROM "Empresa" AS empresa
    WHERE empresa."id" = empresa_demo_id
      AND empresa."nome" IN ('Empresa Demo', 'CaiPim Reformas')
  ) THEN
    RAISE EXCEPTION 'A empresa ligada ao gerente demo não é a empresa de demonstração esperada.';
  END IF;

  -- Evita escolher uma empresa de demonstração ambígua por nome.
  IF EXISTS (
    SELECT 1
    FROM "Empresa" AS empresa
    WHERE empresa."nome" = 'CaiPim Reformas'
      AND empresa."id" <> empresa_demo_id
  ) THEN
    RAISE EXCEPTION 'Já existe outra empresa chamada CaiPim Reformas.';
  END IF;

  -- Exige as duas contas demo existentes que receberão os nomes atualizados.
  IF NOT EXISTS (
    SELECT 1 FROM "Usuario"
    WHERE "email" = 'admin@obramaster.demo' AND "tipo" = 'ADMIN'::"TipoUsuario"
  ) OR NOT EXISTS (
    SELECT 1 FROM "Usuario"
    WHERE "email" = 'cliente@obramaster.demo' AND "tipo" = 'CLIENTE'::"TipoUsuario"
  ) THEN
    RAISE EXCEPTION 'As contas demo de administrador e cliente precisam existir antes deste SQL.';
  END IF;

  -- Não apaga histórico: interrompe se uma das novas contas já tiver programação.
  IF EXISTS (
    SELECT 1
    FROM "Usuario" AS usuario
    JOIN "Funcionario" AS funcionario ON funcionario."usuarioId" = usuario."id"
    WHERE usuario."email" IN ('colaborador2@obramaster.demo', 'colaborador3@obramaster.demo')
      AND (
        EXISTS (
          SELECT 1 FROM "ObraEscala" AS escala
          WHERE escala."funcionarioId" = funcionario."id"
        )
        OR EXISTS (
          SELECT 1 FROM "DisponibilidadeFuncionario" AS disponibilidade
          WHERE disponibilidade."funcionarioId" = funcionario."id"
        )
      )
  ) THEN
    RAISE EXCEPTION 'Uma conta gerente demo nova já possui escala ou disponibilidade; nenhum dado foi removido.';
  END IF;
END $$;

-- Atualiza somente a empresa apontada pelo gerente demo atual.
UPDATE "Empresa" AS empresa
SET "nome" = 'CaiPim Reformas',
    "slogan" = 'O toque final que dá vida ao seu projeto.'
FROM "Usuario" AS gerente
WHERE gerente."email" = 'colaborador@obramaster.demo'
  AND gerente."tipo" = 'COLABORADOR'::"TipoUsuario"
  AND empresa."id" = gerente."empresaId"
  AND empresa."nome" IN ('Empresa Demo', 'CaiPim Reformas');

-- Atualiza os nomes e mantém admin e cliente na mesma empresa demo.
UPDATE "Usuario" AS usuario
SET "nome" = 'Carla Kleia',
    "empresaId" = gerente."empresaId"
FROM "Usuario" AS gerente
WHERE gerente."email" = 'colaborador@obramaster.demo'
  AND gerente."tipo" = 'COLABORADOR'::"TipoUsuario"
  AND usuario."email" = 'admin@obramaster.demo'
  AND usuario."tipo" = 'ADMIN'::"TipoUsuario";

-- Atualiza o nome do cliente demo sem mudar seu e-mail nem sua senha.
UPDATE "Usuario" AS usuario
SET "nome" = 'Marthania Soares',
    "empresaId" = gerente."empresaId"
FROM "Usuario" AS gerente
WHERE gerente."email" = 'colaborador@obramaster.demo'
  AND gerente."tipo" = 'COLABORADOR'::"TipoUsuario"
  AND usuario."email" = 'cliente@obramaster.demo'
  AND usuario."tipo" = 'CLIENTE'::"TipoUsuario";

-- Cria ou atualiza somente os dois novos usuários de demonstração.
WITH gerente_demo AS (
  -- Usa o hash bcrypt existente sem escrever hash ou senha neste arquivo.
  SELECT "empresaId", "senhaHash"
  FROM "Usuario"
  WHERE "email" = 'colaborador@obramaster.demo'
    AND "tipo" = 'COLABORADOR'::"TipoUsuario"
),
novos_usuarios AS (
  -- Define os dois e-mails e nomes autorizados para esta inserção.
  SELECT *
  FROM (VALUES
    ('colaborador2@obramaster.demo'::TEXT, 'Luciano Oliveira'::TEXT),
    ('colaborador3@obramaster.demo'::TEXT, 'Jhonatan Bruno'::TEXT)
  ) AS dados("email", "nome")
)
INSERT INTO "Usuario" ("id", "empresaId", "nome", "email", "senhaHash", "tipo")
SELECT
  -- Gera um identificador repetível sem extensão ou dependência nova.
  substr(md5('obramaster-demo:' || novos_usuarios."email"), 1, 8) || '-' ||
  substr(md5('obramaster-demo:' || novos_usuarios."email"), 9, 4) || '-' ||
  substr(md5('obramaster-demo:' || novos_usuarios."email"), 13, 4) || '-' ||
  substr(md5('obramaster-demo:' || novos_usuarios."email"), 17, 4) || '-' ||
  substr(md5('obramaster-demo:' || novos_usuarios."email"), 21, 12),
  gerente_demo."empresaId",
  novos_usuarios."nome",
  novos_usuarios."email",
  gerente_demo."senhaHash",
  'COLABORADOR'::"TipoUsuario"
FROM gerente_demo
CROSS JOIN novos_usuarios
ON CONFLICT ("email") DO UPDATE
SET "empresaId" = EXCLUDED."empresaId",
    "nome" = EXCLUDED."nome",
    "senhaHash" = EXCLUDED."senhaHash",
    "tipo" = EXCLUDED."tipo"
WHERE "Usuario"."email" IN ('colaborador2@obramaster.demo', 'colaborador3@obramaster.demo');

-- Cria ou atualiza os cadastros de funcionário como Responsável e ativos.
WITH funcionarios_demo AS (
  -- Declara os dados profissionais permitidos para os dois gerentes novos.
  SELECT *
  FROM (VALUES
    ('colaborador2@obramaster.demo'::TEXT, 'Luciano Oliveira'::TEXT, 'Engenheiro'::TEXT),
    ('colaborador3@obramaster.demo'::TEXT, 'Jhonatan Bruno'::TEXT, 'Arquiteto'::TEXT)
  ) AS dados("email", "nome", "funcao")
)
INSERT INTO "Funcionario" ("id", "empresaId", "nome", "funcao", "nivel", "ativo", "usuarioId")
SELECT
  -- Gera um identificador repetível separado dos identificadores de usuário.
  substr(md5('obramaster-funcionario:' || funcionario_demo."email"), 1, 8) || '-' ||
  substr(md5('obramaster-funcionario:' || funcionario_demo."email"), 9, 4) || '-' ||
  substr(md5('obramaster-funcionario:' || funcionario_demo."email"), 13, 4) || '-' ||
  substr(md5('obramaster-funcionario:' || funcionario_demo."email"), 17, 4) || '-' ||
  substr(md5('obramaster-funcionario:' || funcionario_demo."email"), 21, 12),
  usuario."empresaId",
  funcionario_demo."nome",
  funcionario_demo."funcao",
  'RESPONSAVEL'::"NivelFuncionario",
  TRUE,
  usuario."id"
FROM "Usuario" AS usuario
JOIN funcionarios_demo AS funcionario_demo ON funcionario_demo."email" = usuario."email"
WHERE usuario."tipo" = 'COLABORADOR'::"TipoUsuario"
ON CONFLICT ("usuarioId") DO UPDATE
SET "empresaId" = EXCLUDED."empresaId",
    "nome" = EXCLUDED."nome",
    "funcao" = EXCLUDED."funcao",
    "nivel" = EXCLUDED."nivel",
    "ativo" = EXCLUDED."ativo"
WHERE "Funcionario"."usuarioId" IN (
  SELECT "id"
  FROM "Usuario"
  WHERE "email" IN ('colaborador2@obramaster.demo', 'colaborador3@obramaster.demo')
);

-- Confere todos os valores e garante que os gerentes novos seguem sem programação.
DO $$
DECLARE
  -- Guarda a empresa atual do gerente demo usada como referência.
  empresa_demo_id TEXT;
BEGIN
  -- Recupera a empresa sem procurar nem alterar empresas fora do escopo demo.
  SELECT "empresaId"
  INTO empresa_demo_id
  FROM "Usuario"
  WHERE "email" = 'colaborador@obramaster.demo'
    AND "tipo" = 'COLABORADOR'::"TipoUsuario";

  -- Confirma nome e slogan da única empresa demo atualizada.
  IF NOT EXISTS (
    SELECT 1 FROM "Empresa"
    WHERE "id" = empresa_demo_id
      AND "nome" = 'CaiPim Reformas'
      AND "slogan" = 'O toque final que dá vida ao seu projeto.'
  ) THEN
    RAISE EXCEPTION 'A empresa demo não passou na conferência de nome e slogan.';
  END IF;

  -- Confirma que as cinco contas de demonstração pertencem à mesma empresa.
  IF (
    SELECT COUNT(*)
    FROM "Usuario"
    WHERE "email" IN (
      'admin@obramaster.demo',
      'cliente@obramaster.demo',
      'colaborador@obramaster.demo',
      'colaborador2@obramaster.demo',
      'colaborador3@obramaster.demo'
    )
      AND "empresaId" = empresa_demo_id
  ) <> 5 THEN
    RAISE EXCEPTION 'As contas demo não pertencem todas à mesma empresa.';
  END IF;

  -- Confirma os nomes e tipos atualizados das contas demo.
  IF NOT EXISTS (
    SELECT 1 FROM "Usuario"
    WHERE "email" = 'admin@obramaster.demo'
      AND "nome" = 'Carla Kleia'
      AND "tipo" = 'ADMIN'::"TipoUsuario"
  ) OR NOT EXISTS (
    SELECT 1 FROM "Usuario"
    WHERE "email" = 'cliente@obramaster.demo'
      AND "nome" = 'Marthania Soares'
      AND "tipo" = 'CLIENTE'::"TipoUsuario"
  ) THEN
    RAISE EXCEPTION 'As contas demo de administrador e cliente não passaram na conferência.';
  END IF;

  -- Confirma que os dois novos usuários e funcionários estão ativos e são Responsáveis.
  IF (
    SELECT COUNT(*)
    FROM "Usuario" AS usuario
    JOIN "Funcionario" AS funcionario ON funcionario."usuarioId" = usuario."id"
    WHERE usuario."email" IN ('colaborador2@obramaster.demo', 'colaborador3@obramaster.demo')
      AND usuario."tipo" = 'COLABORADOR'::"TipoUsuario"
      AND funcionario."empresaId" = empresa_demo_id
      AND funcionario."nivel" = 'RESPONSAVEL'::"NivelFuncionario"
      AND funcionario."ativo" = TRUE
  ) <> 2 THEN
    RAISE EXCEPTION 'Os dois novos gerentes não passaram na conferência de nível, vínculo e status.';
  END IF;

  -- Confirma o nome, a função e o nível de cada gerente individualmente.
  IF NOT EXISTS (
    SELECT 1
    FROM "Usuario" AS usuario
    JOIN "Funcionario" AS funcionario ON funcionario."usuarioId" = usuario."id"
    WHERE usuario."email" = 'colaborador2@obramaster.demo'
      AND usuario."nome" = 'Luciano Oliveira'
      AND funcionario."nome" = 'Luciano Oliveira'
      AND funcionario."funcao" = 'Engenheiro'
      AND funcionario."nivel" = 'RESPONSAVEL'::"NivelFuncionario"
  ) OR NOT EXISTS (
    SELECT 1
    FROM "Usuario" AS usuario
    JOIN "Funcionario" AS funcionario ON funcionario."usuarioId" = usuario."id"
    WHERE usuario."email" = 'colaborador3@obramaster.demo'
      AND usuario."nome" = 'Jhonatan Bruno'
      AND funcionario."nome" = 'Jhonatan Bruno'
      AND funcionario."funcao" = 'Arquiteto'
      AND funcionario."nivel" = 'RESPONSAVEL'::"NivelFuncionario"
  ) THEN
    RAISE EXCEPTION 'Os dados profissionais de Luciano e Jhonatan não passaram na conferência.';
  END IF;

  -- Confirma que o hash bcrypt das contas novas é o do gerente demo atual.
  IF EXISTS (
    SELECT 1
    FROM "Usuario" AS nova_conta
    CROSS JOIN "Usuario" AS gerente_demo
    WHERE nova_conta."email" IN ('colaborador2@obramaster.demo', 'colaborador3@obramaster.demo')
      AND gerente_demo."email" = 'colaborador@obramaster.demo'
      AND nova_conta."senhaHash" <> gerente_demo."senhaHash"
  ) THEN
    RAISE EXCEPTION 'As contas novas não ficaram com o mesmo hash do gerente demo atual.';
  END IF;

  -- Confirma que os novos gerentes não têm escala nem disponibilidade em obra alguma.
  IF EXISTS (
    SELECT 1
    FROM "Usuario" AS usuario
    JOIN "Funcionario" AS funcionario ON funcionario."usuarioId" = usuario."id"
    WHERE usuario."email" IN ('colaborador2@obramaster.demo', 'colaborador3@obramaster.demo')
      AND (
        EXISTS (
          SELECT 1 FROM "ObraEscala" AS escala
          WHERE escala."funcionarioId" = funcionario."id"
        )
        OR EXISTS (
          SELECT 1 FROM "DisponibilidadeFuncionario" AS disponibilidade
          WHERE disponibilidade."funcionarioId" = funcionario."id"
        )
      )
  ) THEN
    RAISE EXCEPTION 'Luciano e Jhonatan precisam permanecer sem escala e sem disponibilidade.';
  END IF;
END $$;

-- Exibe o resultado final sem mostrar hashes nem dados de senha.
SELECT
  usuario."nome" AS "nomeUsuario",
  usuario."email",
  usuario."tipo",
  funcionario."funcao",
  funcionario."nivel",
  funcionario."ativo",
  empresa."nome" AS "empresa",
  empresa."slogan",
  (
    SELECT COUNT(*) FROM "ObraEscala" AS escala
    WHERE escala."funcionarioId" = funcionario."id"
  ) AS "quantidadeEscalas",
  (
    SELECT COUNT(*) FROM "DisponibilidadeFuncionario" AS disponibilidade
    WHERE disponibilidade."funcionarioId" = funcionario."id"
  ) AS "quantidadeDisponibilidades"
FROM "Usuario" AS usuario
JOIN "Empresa" AS empresa ON empresa."id" = usuario."empresaId"
LEFT JOIN "Funcionario" AS funcionario ON funcionario."usuarioId" = usuario."id"
WHERE usuario."email" IN (
  'admin@obramaster.demo',
  'cliente@obramaster.demo',
  'colaborador@obramaster.demo',
  'colaborador2@obramaster.demo',
  'colaborador3@obramaster.demo'
)
ORDER BY usuario."email";

-- Confirma a transação depois que as verificações e o SELECT final forem executados.
COMMIT;
