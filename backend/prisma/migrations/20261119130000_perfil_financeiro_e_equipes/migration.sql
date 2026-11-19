ALTER TABLE "Empresa"
ADD COLUMN "cnpj" TEXT,
ADD COLUMN "cpfResponsavel" TEXT,
ADD COLUMN "telefone" TEXT,
ADD COLUMN "telefoneSecundario" TEXT,
ADD COLUMN "enderecoResponsavel" TEXT,
ADD COLUMN "endereco" TEXT;

ALTER TABLE "Usuario"
ADD COLUMN "telefoneSecundario" TEXT,
ADD COLUMN "fotoUrl" TEXT;

ALTER TABLE "Obra"
ADD COLUMN "valorBase" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "quantidadeParcelas" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN "taxaJurosMensal" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN "excluidaEm" TIMESTAMP(3),
ADD COLUMN "exclusaoExpiraEm" TIMESTAMP(3),
ADD COLUMN "exclusaoMotivo" TEXT;

UPDATE "Obra" SET "valorBase" = "valorTotal";

ALTER TABLE "Convite"
ADD COLUMN "quantidadeParcelas" INTEGER,
ADD COLUMN "vencimentoInicial" TIMESTAMP(3),
ADD COLUMN "contratoUrl" TEXT;

ALTER TABLE "Funcionario"
ADD COLUMN "fotoUrl" TEXT;

ALTER TABLE "Parcela"
ADD COLUMN "vencimento" TIMESTAMP(3),
ADD COLUMN "comprovanteUrl" TEXT,
ADD COLUMN "comprovanteEnviadoEm" TIMESTAMP(3);

CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "obraId" TEXT,
    "eventoId" TEXT,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "lidaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notificacao_usuarioId_lidaEm_criadoEm_idx"
ON "Notificacao"("usuarioId", "lidaEm", "criadoEm");
CREATE INDEX "Notificacao_empresaId_criadoEm_idx"
ON "Notificacao"("empresaId", "criadoEm");

ALTER TABLE "Notificacao"
ADD CONSTRAINT "Notificacao_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notificacao"
ADD CONSTRAINT "Notificacao_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notificacao"
ADD CONSTRAINT "Notificacao_obraId_fkey"
FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notificacao"
ADD CONSTRAINT "Notificacao_eventoId_fkey"
FOREIGN KEY ("eventoId") REFERENCES "ObraEvento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DisponibilidadeFuncionario" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DisponibilidadeFuncionario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DisponibilidadeFuncionario_funcionarioId_obraId_diaSemana_key"
ON "DisponibilidadeFuncionario"("funcionarioId", "obraId", "diaSemana");
CREATE INDEX "DisponibilidadeFuncionario_obraId_diaSemana_idx"
ON "DisponibilidadeFuncionario"("obraId", "diaSemana");

ALTER TABLE "DisponibilidadeFuncionario"
ADD CONSTRAINT "DisponibilidadeFuncionario_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DisponibilidadeFuncionario"
ADD CONSTRAINT "DisponibilidadeFuncionario_funcionarioId_fkey"
FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DisponibilidadeFuncionario"
ADD CONSTRAINT "DisponibilidadeFuncionario_obraId_fkey"
FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
