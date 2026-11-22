const TEMPO_CACHE_MS = 15_000;
const LIMITE_CACHE = 2000;
const cache = new Map();
const geracoesEmpresa = new Map();

function comCacheEmpresa(empresaId, chave, carregar) {
  const chaveCompleta = `${empresaId}:${chave}`;
  const atual = cache.get(chaveCompleta);
  if (atual?.expiraEm > Date.now()) return atual.promessa || Promise.resolve(atual.valor);
  if (atual) cache.delete(chaveCompleta);

  const geracao = geracoesEmpresa.get(empresaId) || 0;
  const promessa = Promise.resolve().then(carregar).then((valor) => {
    if ((geracoesEmpresa.get(empresaId) || 0) === geracao) {
      if (cache.size >= LIMITE_CACHE) cache.delete(cache.keys().next().value);
      cache.set(chaveCompleta, { empresaId, expiraEm: Date.now() + TEMPO_CACHE_MS, valor });
    }
    return valor;
  }).catch((erro) => {
    if (cache.get(chaveCompleta)?.promessa === promessa) cache.delete(chaveCompleta);
    throw erro;
  });
  cache.set(chaveCompleta, { empresaId, expiraEm: Date.now() + TEMPO_CACHE_MS, promessa });
  return promessa;
}

function invalidarCacheEmpresa(empresaId) {
  if (!empresaId) return;
  geracoesEmpresa.set(empresaId, (geracoesEmpresa.get(empresaId) || 0) + 1);
  for (const [chave, entrada] of cache) {
    if (entrada.empresaId === empresaId) cache.delete(chave);
  }
}

module.exports = { comCacheEmpresa, invalidarCacheEmpresa, TEMPO_CACHE_MS };
