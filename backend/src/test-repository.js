const { listarUsuarios } = require("./repositories/usuarioRepository");

async function testar() {
    const usuarios = await listarUsuarios();

    console.log("Usuários encontrados:");
    console.log(usuarios);
}

testar().catch((erro) => {
    console.error("Erro:", erro);
});