-- Índices aditivos para os filtros recorrentes dos painéis e do histórico.
CREATE INDEX IF NOT EXISTS "Usuario_empresaId_idx"
  ON "Usuario"("empresaId");

CREATE INDEX IF NOT EXISTS "Obra_empresaId_excluidaEm_criadoEm_idx"
  ON "Obra"("empresaId", "excluidaEm", "criadoEm");

CREATE INDEX IF NOT EXISTS "Obra_empresaId_clienteId_excluidaEm_criadoEm_idx"
  ON "Obra"("empresaId", "clienteId", "excluidaEm", "criadoEm");

CREATE INDEX IF NOT EXISTS "Obra_empresaId_excluidaEm_agendadaPara_idx"
  ON "Obra"("empresaId", "excluidaEm", "agendadaPara");

CREATE INDEX IF NOT EXISTS "ObraEscala_funcionarioId_dataFim_idx"
  ON "ObraEscala"("funcionarioId", "dataFim");

CREATE INDEX IF NOT EXISTS "ObraEvento_usuarioId_criadoEm_idx"
  ON "ObraEvento"("usuarioId", "criadoEm");
