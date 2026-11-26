// Normaliza uma função somente para comparar funções repetidas entre gerentes.
function normalizarFuncaoComparacao(funcao) {
  // Converte valores ausentes ou diferentes de texto para uma string segura.
  return String(funcao ?? "")
    // Separa letras acentuadas de seus sinais diacríticos.
    .normalize("NFD")
    // Remove os sinais para comparar letras com e sem acento como iguais.
    .replace(/[\u0300-\u036f]/g, "")
    // Junta sequências de espaços internos em um único espaço.
    .replace(/\s+/g, " ")
    // Remove espaços das pontas somente na cópia usada para comparação.
    .trim()
    // Ignora diferenças entre letras maiúsculas e minúsculas em português.
    .toLocaleLowerCase("pt-BR");
}

// Expõe a regra para a rota e para os testes sem acessar o banco.
module.exports = { normalizarFuncaoComparacao };
