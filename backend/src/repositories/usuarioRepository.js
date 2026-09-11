const { db } = require("../prisma/db");

async function listarUsuarios() {
    const usuarios = await db.orm.public.Usuarios.all();

    return usuarios;
}

module.exports = {
    listarUsuarios
};