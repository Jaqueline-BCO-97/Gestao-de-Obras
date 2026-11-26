-- Revise primeiro os resultados de consulta-perfis-fora-da-demo.sql.
-- Este script remove somente perfis fora da lista autorizada sem vínculos nos modelos conferidos.
-- Perfis com obras, equipe, escalas, histórico, convites, pagamentos ou notificações ficam preservados.
-- Execute este arquivo manualmente no Supabase somente depois de revisar a consulta de conferência.
-- Inicia uma transação para que a limpeza seja aplicada como uma única operação.
BEGIN;

-- Exclui apenas usuários fora da lista que não tenham referências nos dados existentes.
WITH perfis_excluidos AS (
  -- Remove os perfis elegíveis e guarda apenas os dados básicos para conferência.
  DELETE FROM "Usuario" AS usuario
  -- Mantém somente perfis diferentes dos cinco e-mails e tipos autorizados.
  WHERE NOT (
    (usuario."tipo" = 'ADMIN'::"TipoUsuario" AND LOWER(BTRIM(usuario."email")) = 'admin@obramaster.demo')
    OR (usuario."tipo" = 'CLIENTE'::"TipoUsuario" AND LOWER(BTRIM(usuario."email")) = 'cliente@obramaster.demo')
    OR (usuario."tipo" = 'COLABORADOR'::"TipoUsuario" AND LOWER(BTRIM(usuario."email")) IN (
      'colaborador@obramaster.demo',
      'colaborador2@obramaster.demo',
      'colaborador3@obramaster.demo'
    ))
  )
  -- Preserva perfis usados como clientes de obras.
  AND NOT EXISTS (SELECT 1 FROM "Obra" WHERE "clienteId" = usuario."id")
  -- Preserva perfis ligados a cadastros de funcionários.
  AND NOT EXISTS (SELECT 1 FROM "Funcionario" WHERE "usuarioId" = usuario."id")
  -- Preserva perfis que aparecem como responsáveis por alterações de escala.
  AND NOT EXISTS (SELECT 1 FROM "ObraEscala" WHERE "alteradoPorId" = usuario."id")
  -- Preserva autores de eventos de obra.
  AND NOT EXISTS (SELECT 1 FROM "ObraEvento" WHERE "usuarioId" = usuario."id")
  -- Preserva autores de convites.
  AND NOT EXISTS (SELECT 1 FROM "Convite" WHERE "criadoPorId" = usuario."id")
  -- Preserva usuários associados a qualquer tentativa de pagamento.
  AND NOT EXISTS (SELECT 1 FROM "Pagamento" WHERE "usuarioId" = usuario."id")
  -- Preserva usuários que ainda tenham notificações.
  AND NOT EXISTS (SELECT 1 FROM "Notificacao" WHERE "usuarioId" = usuario."id")
  -- Preserva usuários que aceitaram contratos.
  AND NOT EXISTS (SELECT 1 FROM "ContratoAceite" WHERE "usuarioId" = usuario."id")
  -- Retorna os dados básicos para mostrar o que foi removido.
  RETURNING usuario."id", usuario."email", usuario."tipo"
)
-- Exibe os perfis removidos pela transação para conferência.
SELECT "id", "email", "tipo"
FROM perfis_excluidos
-- Mantém o resultado organizado para leitura no painel SQL.
ORDER BY "tipo", "email";

-- Confirma a transação depois de remover somente os perfis sem vínculos encontrados.
COMMIT;
