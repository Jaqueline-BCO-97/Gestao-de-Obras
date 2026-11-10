// Importa o hook useState do React para gerenciar o estado dos campos e telas
import { useState } from 'react'
// Importa o hook useNavigate do react-router-dom para navegação entre páginas
import { useNavigate } from 'react-router-dom'
// Importa as funções de autenticação do serviço de autenticação
import { entrar, salvarSessao, salvarSessaoMock } from '../services/auth.js'
// Importa a função que retorna a rota de destino conforme o perfil do usuário
import { obterRotaDashboard } from '../routes/dashboardRoutes.js'
// Importa as credenciais de teste pré-definidas
import { CONTAS_DEMO } from '../config/demo.js'

// Componente utilitário interno para renderizar ícones SVG conforme o tipo solicitado
function Icone({ tipo, className = 'h-5 w-5' }) {
  // Propriedades padrão compartilhadas por todos os elementos SVG
  const propriedades = {
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true,
  }

  // Ícone de e-mail (carta)
  if (tipo === 'mail') {
    return <svg {...propriedades}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>
  }
  // Ícone de cadeado (senha)
  if (tipo === 'lock') {
    return <svg {...propriedades}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
  }
  // Ícone de seta para a direita
  if (tipo === 'arrow') {
    return <svg {...propriedades}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  }
  // Ícone de brilhos (destaque/recursos)
  if (tipo === 'sparkles') {
    return <svg {...propriedades}><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></svg>
  }
  // Ícone de edifício (obras/construção)
  if (tipo === 'building') {
    return <svg {...propriedades}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 21v-4h6v4M8 7h2m4 0h2M8 11h2m4 0h2" /></svg>
  }
  // Ícone padrão de escudo (segurança)
  return <svg {...propriedades}><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></svg>
}

// Lista fixa de benefícios exibidos no banner lateral da tela de login
const beneficios = [
  // Benefício 1: orçamentos
  { icone: 'sparkles', texto: 'Orçamentos digitais com aprovação em poucos cliques' },
  // Benefício 2: execução
  { icone: 'building', texto: 'Acompanhamento de execução com timeline e progresso' },
  // Benefício 3: relatórios
  { icone: 'shield', texto: 'Pagamentos, relatórios e auditoria centralizados' },
]

// Função auxiliar que traduz códigos de status HTTP em mensagens amigáveis em português
function mensagemDeErro(erro) {
  // Erro 400 indica requisição mal formatada (ex: faltou e-mail ou senha)
  if (erro.status === 400) return 'Informe seu e-mail e sua senha para continuar.'
  // Erro 401 indica credenciais inválidas (usuário não autorizado)
  if (erro.status === 401) return 'E-mail ou senha inválidos. Confira seus dados e tente novamente.'
  // Erro 503 indica servidor indisponível temporariamente
  if (erro.status === 503) return 'O serviço está temporariamente indisponível. Tente novamente em instantes.'
  // Erros da faixa 500 indicam falha interna no servidor
  if (erro.status >= 500) return 'Não foi possível acessar o serviço agora. Tente novamente em instantes.'
  // Mensagem genérica ou a própria mensagem do objeto de erro
  return erro.message || 'Não foi possível entrar. Tente novamente.'
}

// Componente principal da página de Login
export default function Login() {
  // Hook de navegação do React Router para transicionar de rota sem recarregar
  const navigate = useNavigate()

  // Estado que armazena o e-mail digitado no formulário
  const [email, setEmail] = useState('')
  // Estado que armazena a senha digitada no formulário
  const [senha, setSenha] = useState('')
  // Estado que controla se a opção "Lembrar de mim" está marcada (localStorage vs sessionStorage)
  const [lembrarDeMim, setLembrarDeMim] = useState(true)
  // Estado que guarda os erros de validação específicos de cada campo
  const [errosCampo, setErrosCampo] = useState({})
  // Estado que guarda mensagens de erro gerais da tentativa de login
  const [erroLogin, setErroLogin] = useState('')
  // Estado que guarda avisos informativos temporários (ex.: recurso ainda indisponível)
  const [aviso, setAviso] = useState('')
  // Estado booleano para indicar se uma requisição de autenticação está em andamento
  const [carregando, setCarregando] = useState(false)
  // Estado que armazena qual perfil de demonstração está sendo carregado no momento
  const [tipoDemoCarregando, setTipoDemoCarregando] = useState(null)

  // Função para validar localmente os campos de e-mail e senha antes de enviar a requisição
  function validar() {
    // Objeto temporário para acumular mensagens de erro
    const novosErros = {}
    // Normaliza o e-mail removendo espaços em branco extras
    const emailNormalizado = email.trim()

    // Valida se o campo de e-mail foi preenchido
    if (!emailNormalizado) {
      novosErros.email = 'Informe seu e-mail.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
      // Valida o formato do e-mail com expressão regular
      novosErros.email = 'Digite um e-mail válido, como nome@empresa.com.'
    }

    // Valida se a senha foi preenchida
    if (!senha) {
      novosErros.senha = 'Informe sua senha.'
    }

    // Atualiza o estado de erros de campos
    setErrosCampo(novosErros)
    // Retorna verdadeiro se não houver nenhum erro acumulado
    return Object.keys(novosErros).length === 0
  }

  // Função assíncrona que processa a autenticação do usuário
  async function autenticar(emailLogin, senhaLogin, tipoDemo = null) {
    // Limpa erros anteriores
    setErroLogin('')
    // Limpa avisos anteriores
    setAviso('')

    // Se não for acesso de demonstração e a validação falhar, interrompe
    if (!tipoDemo && !validar()) return

    // Ativa o estado de carregamento
    setCarregando(true)
    // Define qual botão de demonstração está em carregamento
    setTipoDemoCarregando(tipoDemo)

    // Tenta realizar a autenticação
    try {
      // Faz a chamada de login na API
      const sessao = await entrar(emailLogin.trim(), senhaLogin)
      // Descobre qual painel deve abrir para o tipo de usuário que fez login
      const destino = obterRotaDashboard(sessao.usuario?.tipo)

      // Valida se o backend retornou o token, o usuário e um destino conhecido
      if (!sessao.token || !sessao.usuario || !destino) {
        setErroLogin('O servidor retornou um perfil de acesso não reconhecido. Entre em contato com o suporte.')
        return
      }

      // Salva a sessão no armazenamento local
      salvarSessao(sessao, lembrarDeMim)
      // Navega para a rota de destino usando o React Router
      navigate(destino)
    } catch (erro) {
      // Caso seja um acesso demo e o backend esteja inacessível (status 0) ou com erro de servidor/banco (status >= 500)
      if (tipoDemo && (erro.status === 0 || erro.status >= 500)) {
        // Gera e salva uma sessão simulada para permitir navegar nas rotas da aplicação mesmo sem o banco/servidor
        const sessaoMock = salvarSessaoMock(tipoDemo)
        // Obtém a rota do painel correspondente ao tipo de perfil demonstrado
        const destino = obterRotaDashboard(sessaoMock.usuario.tipo)
        // Redireciona para o destino utilizando o React Router
        navigate(destino)
        // Encerra a função evitando exibição de alerta de erro
        return
      }

      // Se a conta de demonstração não existir no banco de dados (erro 401)
      if (tipoDemo && erro.status === 401) {
        setErroLogin('A conta de demonstração não existe ou ainda não foi preparada. No banco de demonstração, execute: cd backend && npx prisma db seed.')
      } else {
        // Exibe mensagem amigável de erro
        setErroLogin(mensagemDeErro(erro))
      }
    } finally {
      // Finaliza o estado de carregamento independente do resultado
      setCarregando(false)
      // Reseta o indicador de botão demo carregando
      setTipoDemoCarregando(null)
    }
  }

  // Função disparada no evento de submissão do formulário
  function enviar(event) {
    // Evita o comportamento padrão do navegador de recarregar a página inteira
    event.preventDefault()
    // Executa a autenticação com os dados informados no formulário
    return autenticar(email, senha)
  }

  // Função para acionar o login rápido com credenciais de demonstração
  function entrarComoDemo(tipo) {
    // Recupera as credenciais da conta demo do arquivo de configuração
    const credenciais = CONTAS_DEMO[tipo]
    // Dispara a autenticação usando as credenciais demo
    return autenticar(credenciais.email, credenciais.senha, tipo)
  }

  // Função que informa na tela caso o usuário clique em recursos que ainda serão desenvolvidos
  function informarRecursoIndisponivel(recurso) {
    // Define aviso temporário amigável
    setAviso(`${recurso} ainda não está disponível. Consulte o administrador do sistema.`)
  }

  // Renderização da interface visual da página de Login
  return (
    // Estrutura principal da página dividida em duas colunas em telas grandes (lg)
    <main className="min-h-screen bg-[#f4f7fa] text-ink lg:grid lg:grid-cols-2">
      {/* Coluna da esquerda: Banner ilustrativo com informações institucionais */}
      <aside className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-[#0c2d43] via-[#10405a] to-[#12617a] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        {/* Círculo decorativo no topo direito */}
        <div className="absolute -right-32 -top-28 h-96 w-96 rounded-full border border-white/10" aria-hidden="true" />
        {/* Círculo decorativo na parte inferior esquerda */}
        <div className="absolute -bottom-56 -left-36 h-[34rem] w-[34rem] rounded-full border border-white/10" aria-hidden="true" />

        {/* Logotipo e título do sistema */}
        <div className="relative flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#168cbb] text-white">
            <Icone tipo="building" className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-xl font-bold tracking-tight">ObraMaster</span>
            <span className="mt-0.5 block text-[10px] font-semibold tracking-[0.2em] text-sky-200">GESTÃO DE OBRAS</span>
          </span>
        </div>

        {/* Bloco central do banner com benefícios destacados */}
        <div className="relative max-w-xl py-16">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-sky-200">Gestão simples, do início à entrega</p>
          <h1 className="max-w-xl text-4xl font-bold leading-[1.16] tracking-tight xl:text-5xl">Todo o ciclo da sua obra em uma única plataforma.</h1>
          <ul className="mt-10 space-y-6">
            {beneficios.map((beneficio) => (
              <li key={beneficio.texto} className="flex items-center gap-4 text-sm leading-6 text-sky-50/90 xl:text-base">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-sky-100">
                  <Icone tipo={beneficio.icone} />
                </span>
                <span>{beneficio.texto}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Rodapé do banner institucional */}
        <p className="relative text-xs text-sky-100/60">ObraMaster · Gestão transparente em cada etapa</p>
      </aside>

      {/* Coluna da direita: Formulário interativo de autenticação */}
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-20">
        <div className="w-full max-w-[500px]">
          {/* Cabeçalho do formulário com boas-vindas */}
          <div className="mb-9 lg:mb-11">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#087eae] lg:hidden">ObraMaster · Gestão de obras</p>
            <h2 className="text-3xl font-bold tracking-tight text-[#0c2d43] sm:text-[2.1rem]">Bem-vindo ao ObraMaster</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">Entre com suas credenciais para acessar o painel de gestão.</p>
          </div>

          {/* Formulário com envio gerenciado pelo manipulador 'enviar' */}
          <form onSubmit={enviar} noValidate>
            {/* Campo de e-mail */}
            <div className="mb-5">
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">E-mail</label>
              <div className={`flex h-12 items-center gap-3 rounded-xl border bg-white px-3.5 shadow-sm transition focus-within:ring-2 ${errosCampo.email ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-100' : 'border-slate-300 focus-within:border-[#087eae] focus-within:ring-blue-100'}`}>
                <Icone tipo="mail" className="h-5 w-5 shrink-0 text-slate-500" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setErrosCampo((atuais) => ({ ...atuais, email: '' }))
                    setErroLogin('')
                  }}
                  aria-invalid={Boolean(errosCampo.email)}
                  aria-describedby={errosCampo.email ? 'email-erro' : undefined}
                  className="h-full w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
              {errosCampo.email && <p id="email-erro" className="mt-1.5 text-xs text-red-700" role="alert">{errosCampo.email}</p>}
            </div>

            {/* Campo de senha */}
            <div className="mb-4">
              <label htmlFor="senha" className="mb-2 block text-sm font-medium text-slate-700">Senha</label>
              <div className={`flex h-12 items-center gap-3 rounded-xl border bg-white px-3.5 shadow-sm transition focus-within:ring-2 ${errosCampo.senha ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-100' : 'border-slate-300 focus-within:border-[#087eae] focus-within:ring-blue-100'}`}>
                <Icone tipo="lock" className="h-5 w-5 shrink-0 text-slate-500" />
                <input
                  id="senha"
                  name="senha"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(event) => {
                    setSenha(event.target.value)
                    setErrosCampo((atuais) => ({ ...atuais, senha: '' }))
                    setErroLogin('')
                  }}
                  aria-invalid={Boolean(errosCampo.senha)}
                  aria-describedby={errosCampo.senha ? 'senha-erro' : undefined}
                  className="h-full w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
              {errosCampo.senha && <p id="senha-erro" className="mt-1.5 text-xs text-red-700" role="alert">{errosCampo.senha}</p>}
            </div>

            {/* Opções auxiliares: Lembrar de mim e Esqueci minha senha */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={lembrarDeMim}
                  onChange={(event) => setLembrarDeMim(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-[#0c2d43] focus:ring-[#087eae]"
                />
                Lembrar de mim
              </label>
              <button
                type="button"
                onClick={() => informarRecursoIndisponivel('A recuperação de senha')}
                className="font-semibold text-[#087eae] hover:text-[#0c2d43]"
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Alerta de erro no login, se houver */}
            {erroLogin && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-800" role="alert">{erroLogin}</p>}
            {/* Mensagem informativa/aviso temporário, se houver */}
            {aviso && <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-3 text-sm leading-5 text-sky-900" role="status">{aviso}</p>}

            {/* Botão de envio do formulário */}
            <button
              type="submit"
              disabled={carregando}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0c2d43] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#10405a] focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:opacity-70"
            >
              {carregando ? 'Entrando…' : 'Entrar'}
              {!carregando && <Icone tipo="arrow" className="h-5 w-5" />}
            </button>
          </form>

          {/* Opção para novos clientes se cadastrarem */}
          <p className="mt-7 text-center text-sm text-slate-600">
            Não tem uma conta?{' '}
            <button
              type="button"
              onClick={() => informarRecursoIndisponivel('O cadastro de cliente')}
              className="font-semibold text-[#087eae] hover:text-[#0c2d43]"
            >
              Cadastre-se como cliente
            </button>
          </p>

          {/* Seção com botões de atalho para demonstração e testes rápidos */}
          <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 sm:p-5" aria-label="Acessos de demonstração">
            <h3 className="text-xs font-semibold tracking-wide text-slate-600">ACESSOS DE DEMONSTRAÇÃO</h3>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { tipo: 'CLIENTE', texto: 'Entrar como Cliente' },
                { tipo: 'ADMIN', texto: 'Entrar como Admin' },
              ].map(({ tipo, texto }) => (
                <button
                  key={tipo}
                  type="button"
                  disabled={carregando}
                  onClick={() => entrarComoDemo(tipo)}
                  className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-[#0c2d43] transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                >
                  {tipoDemoCarregando === tipo ? 'Conectando…' : texto}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-4 text-slate-500">
              Contas públicas para testar o acesso como cliente e administrador.
            </p>
          </section>
        </div>
      </section>
    </main>
  )
}
