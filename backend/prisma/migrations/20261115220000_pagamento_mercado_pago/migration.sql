CREATE TYPE "StatusPagamento" AS ENUM (
    'PENDENTE',
    'APROVADO',
    'RECUSADO',
    'CANCELADO',
    'ERRO'
);

CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "parcelaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "chaveIdempotencia" TEXT NOT NULL,
    "pedidoExternoId" TEXT,
    "transacaoExternaId" TEXT,
    "checkoutUrl" TEXT,
    "detalheStatus" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Pagamento_chaveIdempotencia_key"
    ON "Pagamento"("chaveIdempotencia");
CREATE UNIQUE INDEX "Pagamento_pedidoExternoId_key"
    ON "Pagamento"("pedidoExternoId");
CREATE UNIQUE INDEX "Pagamento_transacaoExternaId_key"
    ON "Pagamento"("transacaoExternaId");
CREATE INDEX "Pagamento_obraId_status_idx"
    ON "Pagamento"("obraId", "status");
CREATE INDEX "Pagamento_parcelaId_status_idx"
    ON "Pagamento"("parcelaId", "status");

ALTER TABLE "Pagamento"
    ADD CONSTRAINT "Pagamento_obraId_fkey"
    FOREIGN KEY ("obraId") REFERENCES "Obra"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Parcela_id_obraId_key" ON "Parcela"("id", "obraId");

ALTER TABLE "Pagamento"
    ADD CONSTRAINT "Pagamento_parcelaId_obraId_fkey"
    FOREIGN KEY ("parcelaId", "obraId") REFERENCES "Parcela"("id", "obraId")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Pagamento"
    ADD CONSTRAINT "Pagamento_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
