-- Adiciona horário opcional sem alterar os registros antigos.
ALTER TABLE "DisponibilidadeFuncionario" ADD COLUMN "horarioInicio" TEXT DEFAULT NULL;
