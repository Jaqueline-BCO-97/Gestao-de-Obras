const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'token'

async function requisicaoAutenticada(caminho, opcoes = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) {
    const erro = new Error('Sua sessão não está autenticada. Entre novamente para continuar.')
    erro.status = 401
    throw erro
  }

  const resposta = await fetch(`${API_BASE_URL}${caminho}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...opcoes.headers,
      Authorization: `Bearer ${token}`,
    },
  })

  const dados = await resposta.json().catch(() => ({}))
  if (!resposta.ok) {
    const erro = new Error(dados.erro || 'Não foi possível concluir a solicitação.')
    erro.status = resposta.status
    throw erro
  }
  return dados
}

export async function buscarUsuarioAtual() {
  const dados = await requisicaoAutenticada('/auth/me')
  return dados.usuario
}

export function alterarSenha(senhaAtual, novaSenha) {
  return requisicaoAutenticada('/usuarios/me/senha', {
    method: 'PATCH',
    body: JSON.stringify({ senhaAtual, novaSenha }),
  })
}
