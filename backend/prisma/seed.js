require("dotenv").config();

const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const SENHA_DEMO = "Demo@12345";
const ROUNDS_BCRYPT = 10;
const CONTAS_DEMO = [
  { nome: "Administrador Demo", email: "admin@obramaster.demo", tipo: "ADMIN" },
  { nome: "Cliente Demo", email: "cliente@obramaster.demo", tipo: "CLIENTE" },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("O seed de demonstração não pode ser executado em produção.");
  }

  const prisma = new PrismaClient();
  try {
    let empresa = await prisma.empresa.findFirst({
      where: { nome: "Empresa Demo" },
    });

    if (!empresa) {
      empresa = await prisma.empresa.create({
        data: { nome: "Empresa Demo" },
      });
    }

    const senhaHash = await bcrypt.hash(SENHA_DEMO, ROUNDS_BCRYPT);
    for (const conta of CONTAS_DEMO) {
      await prisma.usuario.upsert({
        where: { email: conta.email },
        update: {
          nome: conta.nome,
          tipo: conta.tipo,
          senhaHash,
          empresaId: empresa.id,
        },
        create: {
          empresaId: empresa.id,
          nome: conta.nome,
          email: conta.email,
          senhaHash,
          tipo: conta.tipo,
        },
      });
      console.log(`Conta de demonstração garantida: ${conta.email} (${conta.tipo})`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erro) => {
  console.error("Falha ao criar as contas de demonstração:", erro.message);
  process.exitCode = 1;
});
