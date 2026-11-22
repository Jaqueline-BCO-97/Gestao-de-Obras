#!/usr/bin/env node

const API = (process.env.OBRAMASTER_API_URL || "http://localhost:3000").replace(/\/$/, "");
const SENHA = process.env.OBRAMASTER_DEMO_PASSWORD || "Demo@12345";
const REPETICOES = 3;
const contas = [
  { nome: "admin", email: "admin@obramaster.demo", tipo: "ADMIN" },
  { nome: "cliente", email: "cliente@obramaster.demo", tipo: "CLIENTE" },
  { nome: "gerente", email: "colaborador@obramaster.demo", tipo: "COLABORADOR" },
];

async function requisitar(caminho, { token, method = "GET", body } = {}) {
  const inicio = process.hrtime.bigint();
  const resposta = await fetch(`${API}${caminho}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const duracaoMs = Number(process.hrtime.bigint() - inicio) / 1e6;
  const conteudo = await resposta.json().catch(() => null);
  return {
    ok: resposta.ok,
    status: resposta.status,
    duracaoMs,
    queries: Number(resposta.headers.get("x-db-query-count") || 0),
    conteudo,
  };
}

async function login(conta) {
  const resultado = await requisitar("/auth/login", { method: "POST", body: { email: conta.email, senha: SENHA } });
  if (!resultado.ok || !resultado.conteudo?.token) {
    throw new Error(`Login demo ${conta.nome} falhou (HTTP ${resultado.status}): ${resultado.conteudo?.erro || "sem token"}`);
  }
  return resultado.conteudo.token;
}

function rotuloCurto(texto) {
  return texto.length > 31 ? `${texto.slice(0, 28)}…` : texto;
}

function mediana(valores) {
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.floor(ordenados.length / 2)];
}

async function medir(linhas, nome, caminho, token) {
  const resultados = [];
  for (let rodada = 1; rodada <= REPETICOES; rodada += 1) {
    const resultado = await requisitar(caminho, { token });
    resultados.push(resultado);
    linhas.push([rotuloCurto(nome), String(rodada), String(resultado.queries), resultado.duracaoMs.toFixed(1), resultado.ok ? "OK" : `HTTP ${resultado.status}`]);
    if (!resultado.ok) console.error(`${nome}: ${resultado.conteudo?.erro || `HTTP ${resultado.status}`}`);
  }
  const tempos = resultados.map((resultado) => resultado.duracaoMs);
  const consultas = resultados.map((resultado) => resultado.queries);
  linhas.push([
    rotuloCurto(`${nome} · resumo`),
    "1ª / med",
    `${resultados[0].queries} / ${mediana(consultas)}`,
    `${resultados[0].duracaoMs.toFixed(1)} / ${mediana(tempos).toFixed(1)}`,
    resultados.every((resultado) => resultado.ok) ? "OK" : "COM ERRO",
  ]);
  return resultados[0];
}

async function main() {
  const tokens = new Map();
  for (const conta of contas) tokens.set(conta.tipo, await login(conta));
  const linhas = [];

  await medir(linhas, "/health (rede, sem banco)", "/health");
  const obrasPorPerfil = new Map();
  for (const conta of contas) {
    const nome = conta.tipo === "ADMIN" ? "painel admin (/obras)" : conta.tipo === "CLIENTE" ? "painel cliente (/obras)" : "painel gerente (/obras)";
    const resultado = await medir(linhas, nome, "/obras", tokens.get(conta.tipo));
    obrasPorPerfil.set(conta.tipo, Array.isArray(resultado?.conteudo) ? resultado.conteudo : []);
  }

  await medir(linhas, "obras arquivadas", "/obras/arquivadas", tokens.get("ADMIN"));
  for (const conta of contas) {
    const obra = obrasPorPerfil.get(conta.tipo)?.[0];
    if (obra?.id) {
      const nome = conta.tipo === "ADMIN" ? "detalhe obra admin" : conta.tipo === "CLIENTE" ? "detalhe obra cliente" : "detalhe obra gerente";
      await medir(linhas, nome, `/obras/${encodeURIComponent(obra.id)}`, tokens.get(conta.tipo));
    } else {
      console.warn(`Sem obra acessível para medir detalhe como ${conta.nome}.`);
    }
  }

  for (const conta of contas) {
    const nome = conta.tipo === "ADMIN" ? "perfil admin (/auth/me)" : conta.tipo === "CLIENTE" ? "perfil cliente (/auth/me)" : "perfil gerente (/auth/me)";
    await medir(linhas, nome, "/auth/me", tokens.get(conta.tipo));
  }
  for (const conta of contas) {
    await medir(linhas, `notificações ${conta.nome}`, "/notificacoes", tokens.get(conta.tipo));
  }

  await medir(linhas, "funcionários (ADMIN)", "/funcionarios", tokens.get("ADMIN"));
  await medir(linhas, "convites (ADMIN)", "/convites", tokens.get("ADMIN"));
  await medir(linhas, "clientes (ADMIN)", "/clientes", tokens.get("ADMIN"));
  await medir(linhas, "pagamentos (ADMIN)", "/pagamentos", tokens.get("ADMIN"));
  await medir(linhas, "pagamentos (CLIENTE)", "/pagamentos", tokens.get("CLIENTE"));
  await medir(linhas, "preços (ADMIN)", "/tabela-precos", tokens.get("ADMIN"));
  await medir(linhas, "preços (CLIENTE)", "/tabela-precos/cliente", tokens.get("CLIENTE"));

  const larguras = [31, 10, 12, 16, 12];
  const cabecalho = ["Rota", "Rodada", "Consultas", "ms", "Resultado"];
  const imprimir = (linha) => `| ${linha.map((valor, indice) => String(valor).padEnd(larguras[indice])).join(" | ")} |`;
  console.log(imprimir(cabecalho));
  console.log(`|-${larguras.map((largura) => "-".repeat(largura)).join("-|-")}-|`);
  for (const linha of linhas) console.log(imprimir(linha));
  console.log(`\nAPI: ${API}. Cada rota foi chamada sequencialmente ${REPETICOES} vezes. A linha de resumo mostra a 1ª chamada (cache frio) e a mediana das três; X-DB-Query-Count conta instruções de dados (SELECT/DML), sem BEGIN/COMMIT nem manutenção do pooler. Rotas restritas são medidas apenas nos perfis autorizados; pagamentos não é medido para COLABORADOR (HTTP 403).`);
}

if (require.main === module) {
  main().catch((erro) => {
    console.error(erro.message);
    process.exitCode = 1;
  });
}

module.exports = { medir, mediana };
