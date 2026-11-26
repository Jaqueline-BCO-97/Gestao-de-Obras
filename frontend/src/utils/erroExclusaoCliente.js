// Decide se uma falha de exclusão pode melhorar com uma nova tentativa.
export function deveOferecerNovaTentativaExclusaoCliente(erro) {
  // Lê o status HTTP preservado pela camada de requisição autenticada.
  const status = Number(erro?.status)
  // Permite repetir falhas sem resposta, falhas do servidor ou conflitos concorrentes.
  return status === 0 || status >= 500 || erro?.codigo === 'CLIENTE_EXCLUSAO_CONCORRENTE'
}
