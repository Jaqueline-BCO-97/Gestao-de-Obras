const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const TOKEN_KEY = 'token'
const USER_KEY = 'usuario'

async function requisicao(caminho, opcoes = {}) {
  let resposta
  try {
    resposta = await fetch(`${API_BASE_URL}${caminho}`, {
      ...opcoes,
      headers: {
        'Content-Type': 'application/json',
        ...opcoes.headers,
      },
    })
  } catch {
    const erro = new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.')
    erro.status = 0
    throw erro
  }

  const dados = await resposta.json().catch(() => ({}))
  if (!resposta.ok) {
    const erro = new Error(dados.erro || 'Não foi possível concluir a solicitação.')
    erro.status = resposta.status
    throw erro
  }
  return dados
}

export async function entrar(email, senha) {
  return requisicao('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  })
}

export function salvarSessao({ token, usuario }, lembrarDeMim) {
  encerrarSessao()
  const armazenamento = lembrarDeMim ? localStorage : sessionStorage
  armazenamento.setItem(TOKEN_KEY, token)
  armazenamento.setItem(USER_KEY, JSON.stringify(usuario))
}

export function encerrarSessao() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

function obterToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
}

async function requisicaoAutenticada(caminho, opcoes = {}) {
  const token = obterToken()
  if (!token) {
    const erro = new Error('Sua sessão não está autenticada. Entre novamente para continuar.')
    erro.status = 401
    throw erro
  }

  return requisicao(caminho, {
    ...opcoes,
    headers: { ...opcoes.headers, Authorization: `Bearer ${token}` },
  })
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
