require("dotenv").config();

const postgres = require("@prisma/orm-postgres/runtime");
const contractJson = require("../prisma/contract.json");

const db = postgres.default({
    contractJson,
    url: process.env.DATABASE_URL
});

async function testar() {
    const runtime = await db.connect();

    const usuarios = await db.orm.public.Usuarios.all();

    console.log("Usuários cadastrados:");
    console.log(usuarios);

    await runtime.close();
}

testar().catch((erro) => {
    console.error("Erro:", erro);
});