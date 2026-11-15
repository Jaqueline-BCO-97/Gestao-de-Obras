-- CreateEnum
CREATE TYPE "NivelFuncionario" AS ENUM ('RESPONSAVEL', 'APOIO');

-- CreateEnum
CREATE TYPE "StatusObra" AS ENUM ('AGENDADA', 'EM_ANDAMENTO', 'AGUARDANDO_CONFERENCIA', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "SituacaoParcela" AS ENUM ('PENDENTE', 'PAGA');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('CONTRATACAO', 'ORCAMENTO_APROVADO', 'AGENDAMENTO', 'STATUS', 'PAGAMENTO', 'ANOTACAO', 'ATUALIZACAO', 'OCORRENCIA', 'FOTO', 'EQUIPE', 'CONTRATO');

-- AlterTable
ALTER TABLE "Obra" ADD COLUMN     "agendadaPara" TIMESTAMP(3),
ADD COLUMN     "clienteId" TEXT,
ADD COLUMN     "conclusaoConfirmadaEm" TIMESTAMP(3),
ADD COLUMN     "conclusaoSolicitadaEm" TIMESTAMP(3),
ADD COLUMN     "prazoFinal" TIMESTAMP(3),
ADD COLUMN     "status" "StatusObra" NOT NULL DEFAULT 'AGENDADA',
ADD COLUMN     "valorTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "telefone" TEXT;

-- CreateTable
CREATE TABLE "Funcionario" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "funcao" TEXT NOT NULL,
    "nivel" "NivelFuncionario" NOT NULL,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "usuarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Funcionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObraEscala" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFim" TIMESTAMP(3),
    "alteradoPorId" TEXT NOT NULL,
    "motivo" TEXT,

    CONSTRAINT "ObraEscala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObraEvento" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "descricao" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "visivelParaCliente" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObraEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parcela" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "situacao" "SituacaoParcela" NOT NULL DEFAULT 'PENDENTE',
    "pagaEm" TIMESTAMP(3),
    "pagamentoExternoId" TEXT,

    CONSTRAINT "Parcela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "termos" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratoAceite" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "aceitoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContratoAceite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TabelaPreco" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "servico" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TabelaPreco_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_usuarioId_key" ON "Funcionario"("usuarioId");

-- CreateIndex
CREATE INDEX "Funcionario_empresaId_idx" ON "Funcionario"("empresaId");

-- CreateIndex
CREATE INDEX "ObraEscala_obraId_idx" ON "ObraEscala"("obraId");

-- CreateIndex
CREATE INDEX "ObraEvento_obraId_criadoEm_idx" ON "ObraEvento"("obraId", "criadoEm");

-- CreateIndex
CREATE INDEX "ObraEvento_empresaId_idx" ON "ObraEvento"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Parcela_pagamentoExternoId_key" ON "Parcela"("pagamentoExternoId");

-- CreateIndex
CREATE INDEX "Parcela_obraId_idx" ON "Parcela"("obraId");

-- CreateIndex
CREATE UNIQUE INDEX "Parcela_obraId_numero_key" ON "Parcela"("obraId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_obraId_key" ON "Contrato"("obraId");

-- CreateIndex
CREATE INDEX "Contrato_empresaId_idx" ON "Contrato"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "ContratoAceite_contratoId_usuarioId_key" ON "ContratoAceite"("contratoId", "usuarioId");

-- CreateIndex
CREATE INDEX "TabelaPreco_empresaId_idx" ON "TabelaPreco"("empresaId");

-- AddForeignKey
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObraEscala" ADD CONSTRAINT "ObraEscala_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObraEscala" ADD CONSTRAINT "ObraEscala_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObraEscala" ADD CONSTRAINT "ObraEscala_alteradoPorId_fkey" FOREIGN KEY ("alteradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObraEvento" ADD CONSTRAINT "ObraEvento_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObraEvento" ADD CONSTRAINT "ObraEvento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObraEvento" ADD CONSTRAINT "ObraEvento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcela" ADD CONSTRAINT "Parcela_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoAceite" ADD CONSTRAINT "ContratoAceite_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoAceite" ADD CONSTRAINT "ContratoAceite_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabelaPreco" ADD CONSTRAINT "TabelaPreco_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
