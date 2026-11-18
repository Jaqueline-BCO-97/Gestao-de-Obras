CREATE TYPE "TipoConvite" AS ENUM ('CLIENTE', 'GERENTE');

CREATE TABLE "Convite" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "tipo" "TipoConvite" NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "funcao" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Convite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Convite_tokenHash_key" ON "Convite"("tokenHash");
CREATE INDEX "Convite_empresaId_email_idx" ON "Convite"("empresaId", "email");
ALTER TABLE "Convite" ADD CONSTRAINT "Convite_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Convite" ADD CONSTRAINT "Convite_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Convite" ADD CONSTRAINT "Convite_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
