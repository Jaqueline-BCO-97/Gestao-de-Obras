// Teste rápido de conexão com o Supabase.
// Uso: cd backend && npm run test-connection (precisa do .env configurado)
require("dotenv").config();
const { isSupabaseConfigured } = require("../src/config/supabase");
const { listarUsuarios } = require("../src/repositories/usuarioRepository");

async function main() {
  if (!isSupabaseConfigured()) {
    console.log(
      "Supabase não configurado. Copie .env.example para .env e preencha SUPABASE_URL e SUPABASE_ANON_KEY."
    );
    process.exit(0);
  }

  const usuarios = await listarUsuarios();
  console.log(`OK! ${usuarios.length} usuário(s) encontrado(s).`);
  console.log(usuarios);
}

main().catch((erro) => {
  console.error("Erro ao conectar no Supabase:", erro.message);
  process.exit(1);
});
