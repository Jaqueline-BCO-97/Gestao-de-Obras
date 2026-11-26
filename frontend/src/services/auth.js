// URL base da API que vem das variáveis de ambiente do Vite ou usa '/api' como padrão
const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '')

// Nome da chave usada para guardar o token JWT no localStorage ou sessionStorage
const TOKEN_KEY = 'token'

// Nome da chave usada para guardar os dados do usuário no localStorage ou sessionStorage
const USER_KEY = 'usuario'
const GETS_EM_ANDAMENTO = new Map()
const RESPOSTAS_GET = new Map()
const TEMPO_CACHE_GET_MS = 15_000
const LIMITE_CACHE_GET = 100
let versaoCacheGet = 0

function clonarResposta(valor) {
  return typeof structuredClone === 'function' ? structuredClone(valor) : JSON.parse(JSON.stringify(valor))
}

function limparCacheLeituras() {
  versaoCacheGet += 1
  RESPOSTAS_GET.clear()
}

// Função auxiliar assíncrona para realizar requisições HTTP usando o fetch da Web API
function requisicao(caminho, opcoes = {}) {
  const metodo = (opcoes.method || 'GET').toUpperCase()
  const token = opcoes.headers?.Authorization || ''
  const chave = metodo === 'GET' ? `${API_BASE_URL}${caminho}:${token}` : null
  if (!chave) limparCacheLeituras()
  if (chave) {
    const guardada = RESPOSTAS_GET.get(chave)
    if (guardada && guardada.expiraEm > Date.now()) return Promise.resolve(clonarResposta(guardada.dados))
    if (guardada) RESPOSTAS_GET.delete(chave)
  }
  if (chave && GETS_EM_ANDAMENTO.has(chave)) return GETS_EM_ANDAMENTO.get(chave)
  const versaoDaLeitura = versaoCacheGet
  const promessa = executarRequisicao(caminho, opcoes).then((dados) => {
    if (chave && versaoDaLeitura === versaoCacheGet) {
      if (RESPOSTAS_GET.size >= LIMITE_CACHE_GET) RESPOSTAS_GET.delete(RESPOSTAS_GET.keys().next().value)
      RESPOSTAS_GET.set(chave, { dados: clonarResposta(dados), expiraEm: Date.now() + TEMPO_CACHE_GET_MS })
    }
    return dados
  })
  if (chave) {
    GETS_EM_ANDAMENTO.set(chave, promessa)
    promessa.then(() => GETS_EM_ANDAMENTO.delete(chave), () => GETS_EM_ANDAMENTO.delete(chave))
  }
  return promessa
}

async function executarRequisicao(caminho, opcoes = {}) {
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
    // Preserva códigos funcionais para que a tela trate cada campo com a mensagem certa.
    erro.codigo = dados.codigo
    erro.tentativaFinalizada = Boolean(dados.tentativaFinalizada)
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

export async function registrarEmpreiteira(dados) {
  return requisicao('/auth/registro-empreiteira', { method: 'POST', body: JSON.stringify(dados) })
}

export async function consultarConvite(token) {
  return requisicao(`/convites/${encodeURIComponent(token)}`)
}

export async function aceitarConvite(token, senha, email) {
  // Lê a sessão para preservar o comportamento atual de quem já entrou na conta.
  const sessao = obterToken()
  // Inclui o e-mail somente quando o formulário anônimo de cliente o fornece.
  const dados = { senha, ...(email !== undefined ? { email } : {}) }
  // Envia a confirmação no corpo e mantém o cabeçalho de sessão existente.
  return requisicao(`/convites/${encodeURIComponent(token)}/aceitar`, { method: 'POST', body: JSON.stringify(dados), ...(sessao ? { headers: { Authorization: `Bearer ${sessao}` } } : {}) })
}

export async function convidarPessoa(tipo, dados) {
  return requisicaoAutenticada(`/convites/${tipo}`, { method: 'POST', body: JSON.stringify(dados) })
}

export async function criarObra(dados) {
  return requisicaoAutenticada('/obras', { method: 'POST', body: JSON.stringify(dados) })
}

export async function listarFuncionarios() {
  return requisicaoAutenticada('/funcionarios')
}

export async function listarClientes() {
  return requisicaoAutenticada('/clientes')
}
export async function buscarCliente(id) { return requisicaoAutenticada(`/clientes/${encodeURIComponent(id)}`) }
export async function excluirCliente(id) { return requisicaoAutenticada(`/clientes/${encodeURIComponent(id)}`, { method: 'DELETE' }) }

export async function listarConvites() {
  return requisicaoAutenticada('/convites')
}

export async function reenviarConvite(id) {
  return requisicaoAutenticada(`/convites/${encodeURIComponent(id)}/reenviar`, { method: 'POST' })
}
// Cancela um convite de gerente ainda não aceito pela rota administrativa existente.
export async function cancelarConviteGerente(id) { return requisicaoAutenticada(`/convites/${encodeURIComponent(id)}`, { method: 'DELETE' }) }
export async function excluirConviteExpirado(id) { return requisicaoAutenticada(`/convites/${encodeURIComponent(id)}`, { method: 'DELETE' }) }

export async function listarTabelaPrecos() { return requisicaoAutenticada('/tabela-precos') }
export async function listarTabelaPrecosCliente() { return requisicaoAutenticada('/tabela-precos/cliente') }
export async function criarPreco(dados) { return requisicaoAutenticada('/tabela-precos', { method: 'POST', body: JSON.stringify(dados) }) }
export async function atualizarPreco(id, dados) { return requisicaoAutenticada(`/tabela-precos/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(dados) }) }
export async function excluirPreco(id) { return requisicaoAutenticada(`/tabela-precos/${encodeURIComponent(id)}`, { method: 'DELETE' }) }
export async function listarCalendario() { return requisicaoAutenticada('/calendario') }
export async function reagendarObra(obraId, agendadaPara, prazoFinal) {
  return requisicaoAutenticada(`/obras/${encodeURIComponent(obraId)}/agendamento`, { method: 'PATCH', body: JSON.stringify({ agendadaPara, prazoFinal }) })
}

export async function encerrarEscala(obraId, alocacaoId, motivo = '') {
  return requisicaoAutenticada(`/obras/${encodeURIComponent(obraId)}/colaboradores/${encodeURIComponent(alocacaoId)}`, {
    method: 'PATCH', body: JSON.stringify({ motivo }),
  })
}

export async function moverGerente(obraId, alocacaoId, novaObraId) {
  return requisicaoAutenticada(`/obras/${encodeURIComponent(obraId)}/colaboradores/${encodeURIComponent(alocacaoId)}/mover`, { method: 'POST', body: JSON.stringify({ novaObraId }) })
}

export async function criarFuncionario(dados) { return requisicaoAutenticada('/funcionarios', { method: 'POST', body: JSON.stringify(dados) }) }
export async function atualizarFuncionario(id, dados) { return requisicaoAutenticada(`/funcionarios/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(dados) }) }
export async function excluirFuncionario(id) { return requisicaoAutenticada(`/funcionarios/${encodeURIComponent(id)}`, { method: 'DELETE' }) }
export async function atualizarPerfil(dados) { return requisicaoAutenticada('/usuarios/me', { method: 'PATCH', body: JSON.stringify(dados) }) }
export async function listarNotificacoes(obraId) { return requisicaoAutenticada(`/notificacoes${obraId ? `?obraId=${encodeURIComponent(obraId)}` : ''}`) }
export async function marcarNotificacaoLida(id) { return requisicaoAutenticada(`/notificacoes/${encodeURIComponent(id)}/lida`, { method: 'PATCH' }) }
export async function excluirNotificacao(id) { return requisicaoAutenticada(`/notificacoes/${encodeURIComponent(id)}`, { method: 'DELETE' }) }
export async function listarPagamentos() { return requisicaoAutenticada('/pagamentos') }
export async function enviarComprovante(obraId, parcelaId, arquivo) { return requisicaoAutenticada(`/obras/${encodeURIComponent(obraId)}/parcelas/${encodeURIComponent(parcelaId)}/comprovante`, { method: 'POST', body: JSON.stringify({ arquivo }) }) }
export async function confirmarPrimeiraParcela(obraId) { return requisicaoAutenticada(`/obras/${encodeURIComponent(obraId)}/parcelas/primeira/confirmar`, { method: 'POST' }) }
export async function arquivarObra(obraId, senha, motivo) { return requisicaoAutenticada(`/obras/${encodeURIComponent(obraId)}/arquivar`, { method: 'POST', body: JSON.stringify({ senha, motivo }) }) }
export async function restaurarObra(obraId) { return requisicaoAutenticada(`/obras/${encodeURIComponent(obraId)}/restaurar`, { method: 'POST' }) }
export async function listarObrasArquivadas() { return requisicaoAutenticada('/obras/arquivadas') }

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
  // Define os nomes reais das contas demo já existentes nos perfis locais.
  const nomesDemo = {
    ADMIN: 'Carla Kleia',
    CLIENTE: 'Marthania Soares',
    COLABORADOR: 'Carlos Eduardo da Silva',
  }
  // Mantém um nome genérico para qualquer perfil mock não listado.
  const nomeUsuario = nomesDemo[tipo] || 'Usuário Demonstração (' + tipo + ')'

  // Cria um objeto de sessão simulada com dados válidos de teste
  const sessaoMock = {
    // Token simulado para autorização mock
    token: `mock-token-${tipo.toLowerCase()}-123456`,
    // Dados fictícios de usuário de acordo com o perfil solicitado
    usuario: {
      // Identificador único numérico fictício (1 para colaborador para casar com o mock de obras, ou 999)
      id: tipo === 'COLABORADOR' ? 1 : 999,
      // Nome amigável de exibição do usuário
      nome: nomeUsuario,
      // E-mail fictício de teste
      email: `demo.${tipo.toLowerCase()}@obramaster.local`,
      // Inclui a empresa demo no perfil administrativo usado sem a API.
      ...(tipo === 'ADMIN' ? { empresa: { nome: 'CaiPim Reformas', slogan: 'O toque final que dá vida ao seu projeto.' } } : {}),
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
  limparCacheLeituras()
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

// Consulta as obras do usuário; o backend restringe CLIENTE ao próprio vínculo.
export async function listarObras() {
  return requisicaoAutenticada('/obras')
}

// A API aplica empresa, perfil e vínculo do cliente antes de retornar a obra.
export async function buscarObra(id) {
  return requisicaoAutenticada(`/obras/${encodeURIComponent(id)}`)
}

// Registra andamento textual e, quando selecionada, foto como data URL.
export async function registrarAndamentoObra(obraId, descricao, tipo, foto, visivelParaCliente) {
  return requisicaoAutenticada(`/obras/${encodeURIComponent(obraId)}/andamento`, {
    method: 'POST',
    body: JSON.stringify({ descricao, tipo, ...(visivelParaCliente !== undefined ? { visivelParaCliente } : {}), ...(foto ? { foto } : {}) }),
  })
}

export async function atualizarObra(id, dados) {
  return requisicaoAutenticada(`/obras/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(dados) })
}

// Atualiza as datas das parcelas pela rota dedicada de vencimento da obra.
export async function atualizarVencimentoObra(id, vencimentoInicial) {
  // Mantém o nome do campo compatível com o PATCH legado.
  return requisicaoAutenticada(`/obras/${encodeURIComponent(id)}/vencimento`, {
    // Envia somente a data inicial para evitar qualquer recálculo financeiro.
    method: 'PATCH',
    // Serializa a data no formato aceito pelo cadastro de obra.
    body: JSON.stringify({ vencimentoInicial }),
  })
}

export async function anexarContratoObra(id, arquivo, termos = '') {
  return requisicaoAutenticada(`/obras/${encodeURIComponent(id)}/contrato`, { method: 'POST', body: JSON.stringify({ arquivo, termos }) })
}
export async function anexarFotoNovaObra(id, foto) { return requisicaoAutenticada(`/obras/${encodeURIComponent(id)}/fotos`, { method: 'POST', body: JSON.stringify({ foto }) }) }

export async function iniciarExecucaoObra(id) {
  return requisicaoAutenticada(`/obras/${encodeURIComponent(id)}/status/iniciar`, { method: 'POST' })
}

export async function listarAlocacoesObra(id) {
  return requisicaoAutenticada(`/obras/${encodeURIComponent(id)}/colaboradores`)
}

export async function encerrarAlocacaoObra(obraId, alocacaoId, motivo = '') {
  return requisicaoAutenticada(`/obras/${encodeURIComponent(obraId)}/colaboradores/${encodeURIComponent(alocacaoId)}`, { method: 'PATCH', body: JSON.stringify({ motivo }) })
}
export async function alocarFuncionarioObra(obraId, funcionarioId) { return requisicaoAutenticada(`/obras/${encodeURIComponent(obraId)}/colaboradores`, { method: 'POST', body: JSON.stringify({ funcionarioId }) }) }

// Cria checkout pela API; o servidor confere propriedade, saldo e idempotência.
export async function iniciarPagamento(obraId, parcelaId, valor, idempotencyKey) {
  return requisicaoAutenticada(`/obras/${encodeURIComponent(obraId)}/pagamento`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ parcelaId, valor }),
  })
}

// Retoma pelo identificador persistido; a chave idempotente permanece somente no backend.
export async function retomarPagamento(obraId, tentativaId) {
  return requisicaoAutenticada(`/obras/${encodeURIComponent(obraId)}/pagamentos/${encodeURIComponent(tentativaId)}/retomar`, {
    method: 'POST',
  })
}

export async function confirmarConclusaoObra(obraId) {
  return requisicaoAutenticada(`/obras/${encodeURIComponent(obraId)}/conclusao/confirmar`, { method: 'POST' })
}

export async function solicitarConferenciaObra(obraId) {
  return requisicaoAutenticada(`/obras/${encodeURIComponent(obraId)}/conclusao/solicitar`, { method: 'POST' })
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
