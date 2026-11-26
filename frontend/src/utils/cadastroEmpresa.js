// Prepara os dados do cadastro sem enviar a opção de interface para a API.
export function montarPayloadCadastroEmpresa(dados = {}) {
  // Remove a flag temporária usada apenas para desabilitar o complemento.
  const { semComplemento, ...payload } = dados
  // Persiste complemento vazio quando a pessoa marca que não existe complemento.
  return { ...payload, complemento: semComplemento ? '' : (payload.complemento || '') }
}
