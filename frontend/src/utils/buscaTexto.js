// Normaliza textos para comparações de busca sem diferença de acento ou caixa.
export function normalizarTextoBusca(valor) {
  // Converte valores ausentes em texto vazio antes de normalizar.
  return String(valor ?? '')
    // Separa letras acentuadas de seus sinais diacríticos.
    .normalize('NFD')
    // Remove os sinais para permitir buscas como "area" por "Área".
    .replace(/[\u0300-\u036f]/g, '')
    // Ignora diferenças entre letras maiúsculas e minúsculas.
    .toLocaleLowerCase('pt-BR')
}

// Informa se o texto contém a busca depois da normalização.
export function textoCorrespondeBusca(texto, busca) {
  // Normaliza os dois lados e ignora espaços nas pontas da consulta.
  return normalizarTextoBusca(texto).includes(normalizarTextoBusca(busca).trim())
}
