// URL base da API que vem das variáveis de ambiente do Vite ou usa '/api' como padrão
const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '')

// Nome da chave usada para guardar o token JWT no localStorage ou sessionStorage
const TOKEN_KEY = 'token'

// Nome da chave usada para guardar os dados do usuário no localStorage ou sessionStorage
const USER_KEY = 'usuario'

// Função auxiliar assíncrona para realizar requisições HTTP usando o fetch da Web API
async function requisicao(caminho, opcoes = {}) {
  // Variável que irá armazenar a resposta da requisição fetch
  let resposta

  // Bloco try para capturar falhas de rede (ex.: servidor fora do ar)
  try {
    // Executa a requisição HTTP para a URL completa (URL base + caminho especificado)
    resposta = await fetch(`${API_BASE_URL}${caminho}`, {
      // Espalha as opções passadas (método, body, etc.)
      ...opcoes,
      // Configura os cabeçalhos HTTP padrão
      headers: {
        // Define que o corpo da requisição é no formato JSON
        'Content-Type': 'application/json',
        // Permite sobrescrever ou adicionar novos cabeçalhos
        ...opcoes.headers,
      },
    })
  } catch {
    // Se a conexão falhar completamente (sem internet ou servidor offline), cria um erro amigável
    const erro = new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.')
    // Define status 0 indicando falha de rede/conexão
    erro.status = 0
    // Lança o erro para quem chamou a função tratar
    throw erro
  }

  // Tenta converter a resposta para formato JSON, ou retorna objeto vazio se falhar
  const dados = await resposta.json().catch(() => ({}))

  // Se a resposta HTTP não foi bem-sucedida (status fora da faixa 200-299)
  if (!resposta.ok) {
    // Cria um objeto de erro com a mensagem retornada pela API ou uma mensagem padrão
    const erro = new Error(dados.erro || 'Não foi possível concluir a solicitação.')
    // Anexa o código de status HTTP retornado pelo servidor ao erro
    erro.status = resposta.status
    // Lança o erro para a camada superior tratar
    throw erro
  }

  // Retorna os dados convertidos do JSON
  return dados
}

// Função para realizar o login do usuário enviando e-mail e senha para o backend
export async function entrar(email, senha) {
  // Faz uma requisição POST para a rota /auth/login com o e-mail e a senha em formato JSON
  return requisicao('/auth/login', {
    // Define o método HTTP como POST
    method: 'POST',
    // Converte o objeto com email e senha para string JSON
    body: JSON.stringify({ email, senha }),
  })
}

// Função para salvar os dados da sessão (token e dados do usuário) no navegador
export function salvarSessao({ token, usuario }, lembrarDeMim) {
  // Limpa qualquer sessão anterior para garantir que não haja lixo de logins passados
  encerrarSessao()
  // Se 'lembrarDeMim' for verdadeiro, salva no localStorage (permanente); senão, no sessionStorage (temporário)
  const armazenamento = lembrarDeMim ? localStorage : sessionStorage
  // Guarda o token de autenticação JWT no armazenamento escolhido
  armazenamento.setItem(TOKEN_KEY, token)
  // Converte o objeto de usuário em texto JSON e o guarda no armazenamento escolhido
  armazenamento.setItem(USER_KEY, JSON.stringify(usuario))
}

// Função para simular uma sessão mock (útil para desenvolvimento, testes e navegação sem backend)
export function salvarSessaoMock(tipo = 'CLIENTE') {
  // Cria um objeto de sessão simulada com dados válidos de teste
  const sessaoMock = {
    // Token simulado para autorização mock
    token: `mock-token-${tipo.toLowerCase()}-123456`,
    // Dados fictícios de usuário de acordo com o perfil solicitado
    usuario: {
      // Identificador único numérico fictício
      id: 999,
      // Nome amigável de exibição do usuário
      nome: `Usuário Demonstração (${tipo})`,
      // E-mail fictício de teste
      email: `demo.${tipo.toLowerCase()}@obramaster.local`,
      // Perfil/tipo do usuário (CLIENTE, ADMIN ou COLABORADOR)
      tipo: tipo,
    },
  }
  // Salva a sessão simulada no sessionStorage (duração da aba)
  salvarSessao(sessaoMock, false)
  // Retorna a sessão criada para uso imediato
  return sessaoMock
}

// Função para encerrar a sessão (fazer logout) limpando o armazenamento
export function encerrarSessao() {
  // Remove o token do localStorage
  localStorage.removeItem(TOKEN_KEY)
  // Remove o usuário do localStorage
  localStorage.removeItem(USER_KEY)
  // Remove o token do sessionStorage
  sessionStorage.removeItem(TOKEN_KEY)
  // Remove o usuário do sessionStorage
  sessionStorage.removeItem(USER_KEY)
}

// Função para obter o token salvo, procurando primeiro no localStorage e depois no sessionStorage
export function obterToken() {
  // Retorna o token se existir em um dos dois armazenamentos, ou null/undefined
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
}

// Função que verifica se o usuário está autenticado no momento (mock ou real)
export function estaAutenticado() {
  // Retorna true se houver um token salvo, ou false caso contrário
  return Boolean(obterToken())
}

// Função auxiliar assíncrona para fazer requisições que exigem token de autenticação
async function requisicaoAutenticada(caminho, opcoes = {}) {
  // Recupera o token salvo atualmente
  const token = obterToken()

  // Se não existir token salvo, o usuário não tem autorização para continuar
  if (!token) {
    // Cria um erro explicando a necessidade de login
    const erro = new Error('Sua sessão não está autenticada. Entre novamente para continuar.')
    // Define o código 401 (Não Autorizado)
    erro.status = 401
    // Lança o erro
    throw erro
  }

  // Faz a requisição incluindo o token no cabeçalho Authorization no formato Bearer
  return requisicao(caminho, {
    // Mantém as opções originais da requisição
    ...opcoes,
    // Acrescenta o cabeçalho Authorization com o token JWT
    headers: { ...opcoes.headers, Authorization: `Bearer ${token}` },
  })
}

// Função para buscar no backend os dados mais atualizados do usuário autenticado
export async function buscarUsuarioAtual() {
  // Chama a rota autenticada /auth/me que retorna o perfil do usuário logado
  const dados = await requisicaoAutenticada('/auth/me')
  // Retorna apenas a propriedade 'usuario' dos dados retornados
  return dados.usuario
}

// Função para solicitar alteração de senha da conta do usuário atual
export function alterarSenha(senhaAtual, novaSenha) {
  // Envia requisição PATCH com a senha atual e a nova senha para o backend
  return requisicaoAutenticada('/usuarios/me/senha', {
    // Método PATCH para atualização parcial de dados
    method: 'PATCH',
    // Converte as senhas para string JSON no corpo da requisição
    body: JSON.stringify({ senhaAtual, novaSenha }),
  })
}
