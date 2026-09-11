const { getSupabase, isSupabaseConfigured } = require("../config/supabase");

async function listarUsuarios() {
  if (!isSupabaseConfigured()) {
    const erro = new Error(
      "Supabase não configurado. Defina SUPABASE_URL e SUPABASE_ANON_KEY no .env"
    );
    erro.code = "SUPABASE_NOT_CONFIGURED";
    throw erro;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, empresa_id, nome, email, tipo, criado_em")
    .order("criado_em", { ascending: false });

  if (error) throw error;
  return data;
}

module.exports = { listarUsuarios };
