// Importa o executor de testes nativo do Node.js.
const test = require("node:test");
// Importa as verificações estritas para validar o conteúdo dos scripts SQL.
const assert = require("node:assert/strict");
// Importa o sistema de arquivos para ler os scripts sem abrir conexão com o banco.
const fs = require("node:fs");
// Importa utilitários para montar caminhos compatíveis com o sistema operacional.
const path = require("node:path");
// Localiza a pasta Prisma a partir da pasta de testes do backend.
const pastaPrisma = path.join(__dirname, "..", "prisma");
// Lê o script de remoção de perfis fora da lista demo autorizada.
const sqlLimpeza = fs.readFileSync(path.join(pastaPrisma, "limpeza-perfis-fora-da-demo.sql"), "utf8");
// Lê a consulta somente de leitura que permite revisar perfis e vínculos.
const sqlConsulta = fs.readFileSync(path.join(pastaPrisma, "consulta-perfis-fora-da-demo.sql"), "utf8");

// Confirma que a exclusão mantém exatamente os cinco perfis indicados.
test("a limpeza preserva os cinco perfis demo autorizados", () => {
  // Confirma que o perfil ADMIN está protegido pela combinação de tipo e e-mail.
  assert.match(sqlLimpeza, /'ADMIN'::"TipoUsuario" AND LOWER\(BTRIM\(usuario\."email"\)\) = 'admin@obramaster\.demo'/);
  // Confirma que o perfil CLIENTE está protegido pela combinação de tipo e e-mail.
  assert.match(sqlLimpeza, /'CLIENTE'::"TipoUsuario" AND LOWER\(BTRIM\(usuario\."email"\)\) = 'cliente@obramaster\.demo'/);
  // Confirma que os três perfis COLABORADOR estão na lista permitida.
  assert.match(sqlLimpeza, /'colaborador@obramaster\.demo'[\s\S]*'colaborador2@obramaster\.demo'[\s\S]*'colaborador3@obramaster\.demo'/);
})

// Confirma que o script não apaga perfis com vínculos nos modelos consultados.
test("a limpeza preserva perfis associados a obras, equipe ou histórico", () => {
  // Confirma que a remoção é limitada à tabela Usuario.
  assert.match(sqlLimpeza, /DELETE FROM "Usuario" AS usuario/);
  // Confirma que perfis ligados como clientes de obras não são removidos.
  assert.match(sqlLimpeza, /NOT EXISTS \(SELECT 1 FROM "Obra" WHERE "clienteId" = usuario\."id"\)/);
  // Confirma que perfis ligados a cadastros de funcionários não são removidos.
  assert.match(sqlLimpeza, /NOT EXISTS \(SELECT 1 FROM "Funcionario" WHERE "usuarioId" = usuario\."id"\)/);
  // Confirma que escalas, eventos e convites são protegidos.
  assert.match(sqlLimpeza, /"ObraEscala"[\s\S]*"ObraEvento"[\s\S]*"Convite"/);
  // Confirma que pagamentos, notificações e aceites de contrato são protegidos.
  assert.match(sqlLimpeza, /"Pagamento"[\s\S]*"Notificacao"[\s\S]*"ContratoAceite"/);
})

// Confirma que a conferência é somente leitura e informa vínculos conhecidos.
test("a consulta de conferência é somente leitura e lista as referências", () => {
  // Confirma que a consulta parte da tabela de usuários e não contém comando de exclusão.
  assert.match(sqlConsulta, /FROM "Usuario" AS usuario/);
  assert.doesNotMatch(sqlConsulta, /\bDELETE\b|\bUPDATE\b|\bINSERT\b/i);
  // Confirma que a consulta classifica perfis sem vínculo e perfis que devem ser preservados.
  assert.match(sqlConsulta, /SEM VINCULOS CONHECIDOS/);
  assert.match(sqlConsulta, /COM VINCULOS/);
})
