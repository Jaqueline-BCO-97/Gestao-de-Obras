const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../index");
const { isDbConfigured, getPrisma } = require("../src/config/db");

describe("Issue #32 — PATCH /usuarios/me/senha (Troca de senha)", () => {
  let server;
  let baseUrl;
  let prisma;
  let usuarioTeste;
  let tokenAuth;
  let dbDisponivel = false;

  const senhaOriginal = "SenhaAntiga@123";
  const novaSenha = "NovaSenhaSegura@456";
  const emailTeste = `test-trocasenha-${Date.now()}@teste.com`;

  before(async () => {
    // Garante JWT_SECRET para os testes
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = "jwt_secret_para_testes_obramaster_2026";
    }

    // Inicia o servidor HTTP em uma porta livre
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    if (isDbConfigured()) {
      prisma = getPrisma();
      try {
        // Busca ou cria uma empresa para vincular ao usuário de teste
        let empresa = await prisma.empresa.findFirst();
        if (!empresa) {
          empresa = await prisma.empresa.create({
            data: { nome: "Empresa de Testes" },
          });
        }

        const senhaHashOriginal = await bcrypt.hash(senhaOriginal, 10);
        usuarioTeste = await prisma.usuario.create({
          data: {
            nome: "Usuário Teste Troca Senha",
            email: emailTeste,
            senhaHash: senhaHashOriginal,
            tipo: "COLABORADOR",
            empresaId: empresa.id,
          },
        });

        tokenAuth = jwt.sign(
          {
            id: usuarioTeste.id,
            email: usuarioTeste.email,
            tipo: usuarioTeste.tipo,
            empresaId: usuarioTeste.empresaId,
          },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        dbDisponivel = true;
      } catch (err) {
        console.warn(
          "Não foi possível conectar ao banco de dados:",
          err.message
        );
      }
    }
  });

  after(async () => {
    if (dbDisponivel && prisma && usuarioTeste?.id) {
      try {
        await prisma.usuario.delete({ where: { id: usuarioTeste.id } });
      } catch {
        // Ignora se o usuário já tiver sido removido
      }
      await prisma.$disconnect();
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("1. Usuário sem autenticação não consegue alterar a senha", async () => {
    const res = await fetch(`${baseUrl}/usuarios/me/senha`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        senhaAtual: senhaOriginal,
        novaSenha: novaSenha,
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 401);
    assert.ok(body.erro, "Deveria retornar mensagem de erro para rota desprotegida");
    assert.match(body.erro, /token/i);
  });

  it("Validação de entrada: erro se senha atual ou nova senha não forem fornecidas", async (t) => {
    if (!dbDisponivel) {
      t.skip("Requer banco de dados configurado");
      return;
    }

    const res = await fetch(`${baseUrl}/usuarios/me/senha`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAuth}`,
      },
      body: JSON.stringify({
        senhaAtual: senhaOriginal,
        // novaSenha ausente
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 400);
    assert.ok(body.erro);
    assert.match(body.erro, /obrigatórias/i);
  });

  it("2. Usuário autenticado com senha atual incorreta recebe erro", async (t) => {
    if (!dbDisponivel) {
      t.skip("Requer banco de dados configurado");
      return;
    }

    const res = await fetch(`${baseUrl}/usuarios/me/senha`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAuth}`,
      },
      body: JSON.stringify({
        senhaAtual: "SenhaTotalmenteIncorreta999!",
        novaSenha: novaSenha,
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 400);
    assert.ok(body.erro);
    assert.match(body.erro, /senha atual incorreta/i);
  });

  let respostaSucessoBody = null;

  it("3. Usuário autenticado consegue alterar a própria senha informando a senha atual correta", async (t) => {
    if (!dbDisponivel) {
      t.skip("Requer banco de dados configurado");
      return;
    }

    const res = await fetch(`${baseUrl}/usuarios/me/senha`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAuth}`,
      },
      body: JSON.stringify({
        senhaAtual: senhaOriginal,
        novaSenha: novaSenha,
      }),
    });

    respostaSucessoBody = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(respostaSucessoBody.mensagem);
    assert.match(respostaSucessoBody.mensagem, /sucesso/i);
  });

  it("4. A nova senha é armazenada como hash bcrypt e não como texto puro", async (t) => {
    if (!dbDisponivel) {
      t.skip("Requer banco de dados configurado");
      return;
    }

    const usuarioAtualizado = await prisma.usuario.findUnique({
      where: { id: usuarioTeste.id },
    });

    assert.ok(usuarioAtualizado, "Usuário deve existir no banco de dados");
    // Não pode estar em texto puro
    assert.notStrictEqual(usuarioAtualizado.senhaHash, novaSenha);
    assert.notStrictEqual(usuarioAtualizado.senhaHash, senhaOriginal);

    // Deve ser um hash bcrypt válido (começa com $2b$ ou $2a$)
    assert.match(usuarioAtualizado.senhaHash, /^\$2[ab]\$\d{2}\$/);

    // Deve validar positivamente com bcrypt.compare para a nova senha
    const bateNovaSenha = await bcrypt.compare(
      novaSenha,
      usuarioAtualizado.senhaHash
    );
    assert.strictEqual(bateNovaSenha, true, "Hash deve ser válido para a nova senha");

    // Não deve validar para a senha antiga
    const bateAntiga = await bcrypt.compare(
      senhaOriginal,
      usuarioAtualizado.senhaHash
    );
    assert.strictEqual(bateAntiga, false, "Hash não deve validar para a senha antiga");
  });

  it("5. A resposta da API não contém senha nem hash", (t) => {
    if (!dbDisponivel) {
      t.skip("Requer banco de dados configurado");
      return;
    }

    assert.ok(respostaSucessoBody, "Deveria ter a resposta de sucesso");
    assert.strictEqual(respostaSucessoBody.senha, undefined);
    assert.strictEqual(respostaSucessoBody.novaSenha, undefined);
    assert.strictEqual(respostaSucessoBody.senhaAtual, undefined);
    assert.strictEqual(respostaSucessoBody.senhaHash, undefined);
    assert.strictEqual(respostaSucessoBody.hash, undefined);

    const jsonString = JSON.stringify(respostaSucessoBody).toLowerCase();
    assert.strictEqual(jsonString.includes("hash"), false);
    assert.strictEqual(jsonString.includes(novaSenha.toLowerCase()), false);
    assert.strictEqual(jsonString.includes(senhaOriginal.toLowerCase()), false);
  });

  it("6. Depois da alteração, a nova senha pode ser utilizada no login", async (t) => {
    if (!dbDisponivel) {
      t.skip("Requer banco de dados configurado");
      return;
    }

    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: emailTeste,
        senha: novaSenha,
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200, "Login com nova senha deve retornar 200");
    assert.ok(body.token, "Login deve retornar token JWT");
    assert.ok(body.usuario, "Login deve retornar dados do usuário");
    assert.strictEqual(body.usuario.email, emailTeste);
    assert.strictEqual(body.usuario.senha, undefined, "Não deve expor senha no login");
    assert.strictEqual(body.usuario.senhaHash, undefined, "Não deve expor hash no login");
  });

  it("7. A senha antiga deixa de funcionar no login", async (t) => {
    if (!dbDisponivel) {
      t.skip("Requer banco de dados configurado");
      return;
    }

    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: emailTeste,
        senha: senhaOriginal,
      }),
    });

    const body = await res.json();
    assert.strictEqual(
      res.status,
      401,
      "Login com senha antiga deve ser recusado com 401"
    );
    assert.ok(body.erro, "Deve retornar mensagem de erro");
  });
});
