import { useState } from 'react'
import { entrar, salvarSessao } from '../services/auth.js'
import { obterRotaDashboard } from '../routes/dashboardRoutes.js'

function Icone({ tipo, className = 'h-5 w-5' }) {
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

  if (tipo === 'mail') {
    return <svg {...propriedades}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>
  }
  if (tipo === 'lock') {
    return <svg {...propriedades}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
  }
  if (tipo === 'arrow') {
    return <svg {...propriedades}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  }
  if (tipo === 'sparkles') {
    return <svg {...propriedades}><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></svg>
  }
  if (tipo === 'building') {
    return <svg {...propriedades}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 21v-4h6v4M8 7h2m4 0h2M8 11h2m4 0h2" /></svg>
  }
  return <svg {...propriedades}><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></svg>
}

const beneficios = [
  { icone: 'sparkles', texto: 'Orçamentos digitais com aprovação em poucos cliques' },
  { icone: 'building', texto: 'Acompanhamento de execução com timeline e progresso' },
  { icone: 'shield', texto: 'Pagamentos, relatórios e auditoria centralizados' },
]

function mensagemDeErro(erro) {
  if (erro.status === 400) return 'Informe seu e-mail e sua senha para continuar.'
  if (erro.status === 401) return 'E-mail ou senha inválidos. Confira seus dados e tente novamente.'
  if (erro.status === 503) return 'O serviço está temporariamente indisponível. Tente novamente em instantes.'
  if (erro.status >= 500) return 'Não foi possível acessar o serviço agora. Tente novamente em instantes.'
  return erro.message || 'Não foi possível entrar. Tente novamente.'
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [lembrarDeMim, setLembrarDeMim] = useState(true)
  const [errosCampo, setErrosCampo] = useState({})
  const [erroLogin, setErroLogin] = useState('')
  const [aviso, setAviso] = useState('')
  const [carregando, setCarregando] = useState(false)

  function validar() {
    const novosErros = {}
    const emailNormalizado = email.trim()
    if (!emailNormalizado) novosErros.email = 'Informe seu e-mail.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
      novosErros.email = 'Digite um e-mail válido, como nome@empresa.com.'
    }
    if (!senha) novosErros.senha = 'Informe sua senha.'
    setErrosCampo(novosErros)
    return Object.keys(novosErros).length === 0
  }

  async function enviar(event) {
    event.preventDefault()
    setErroLogin('')
    setAviso('')
    if (!validar()) return

    setCarregando(true)
    try {
      const sessao = await entrar(email.trim(), senha)
      const destino = obterRotaDashboard(sessao.usuario?.tipo)
      if (!sessao.token || !sessao.usuario || !destino) {
        setErroLogin('O servidor retornou um perfil de acesso não reconhecido. Entre em contato com o suporte.')
        return
      }
      salvarSessao(sessao, lembrarDeMim)
      window.location.assign(destino)
    } catch (erro) {
      setErroLogin(mensagemDeErro(erro))
    } finally {
      setCarregando(false)
    }
  }

  function informarRecursoIndisponivel(recurso) {
    setAviso(`${recurso} ainda não está disponível. Consulte o administrador do sistema.`)
  }

  return (
    <main className="min-h-screen bg-[#f4f7fa] text-ink lg:grid lg:grid-cols-2">
      <aside className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-[#0c2d43] via-[#10405a] to-[#12617a] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="absolute -right-32 -top-28 h-96 w-96 rounded-full border border-white/10" aria-hidden="true" />
        <div className="absolute -bottom-56 -left-36 h-[34rem] w-[34rem] rounded-full border border-white/10" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#168cbb] text-white"><Icone tipo="building" className="h-6 w-6" /></span>
          <span><span className="block text-xl font-bold tracking-tight">ObraMaster</span><span className="mt-0.5 block text-[10px] font-semibold tracking-[0.2em] text-sky-200">GESTÃO DE OBRAS</span></span>
        </div>

        <div className="relative max-w-xl py-16">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-sky-200">Gestão simples, do início à entrega</p>
          <h1 className="max-w-xl text-4xl font-bold leading-[1.16] tracking-tight xl:text-5xl">Todo o ciclo da sua obra em uma única plataforma.</h1>
          <ul className="mt-10 space-y-6">
            {beneficios.map((beneficio) => (
              <li key={beneficio.texto} className="flex items-center gap-4 text-sm leading-6 text-sky-50/90 xl:text-base">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-sky-100"><Icone tipo={beneficio.icone} /></span>
                <span>{beneficio.texto}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sky-100/60">ObraMaster · Gestão transparente em cada etapa</p>
      </aside>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-20">
        <div className="w-full max-w-[500px]">
          <div className="mb-9 lg:mb-11">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-primary lg:hidden">ObraMaster · Gestão de obras</p>
            <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-[2.1rem]">Bem-vindo ao ObraMaster</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">Entre com suas credenciais para acessar o painel de gestão.</p>
          </div>

          <form onSubmit={enviar} noValidate>
            <div className="mb-5">
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink">E-mail</label>
              <div className={`flex h-12 items-center gap-3 rounded-xl border bg-white px-3.5 shadow-sm transition focus-within:ring-2 ${errosCampo.email ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-100' : 'border-slate-300 focus-within:border-primary focus-within:ring-blue-100'}`}>
                <Icone tipo="mail" className="h-5 w-5 shrink-0 text-slate-500" />
                <input id="email" name="email" type="email" inputMode="email" autoComplete="username" placeholder="seu@email.com" value={email} onChange={(event) => { setEmail(event.target.value); setErrosCampo((atuais) => ({ ...atuais, email: '' })); setErroLogin('') }} aria-invalid={Boolean(errosCampo.email)} aria-describedby={errosCampo.email ? 'email-erro' : undefined} className="h-full w-full bg-transparent text-sm text-ink outline-none placeholder:text-slate-400" />
              </div>
              {errosCampo.email && <p id="email-erro" className="mt-1.5 text-xs text-red-700" role="alert">{errosCampo.email}</p>}
            </div>

            <div className="mb-4">
              <label htmlFor="senha" className="mb-2 block text-sm font-medium text-ink">Senha</label>
              <div className={`flex h-12 items-center gap-3 rounded-xl border bg-white px-3.5 shadow-sm transition focus-within:ring-2 ${errosCampo.senha ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-100' : 'border-slate-300 focus-within:border-primary focus-within:ring-blue-100'}`}>
                <Icone tipo="lock" className="h-5 w-5 shrink-0 text-slate-500" />
                <input id="senha" name="senha" type="password" autoComplete="current-password" placeholder="Digite sua senha" value={senha} onChange={(event) => { setSenha(event.target.value); setErrosCampo((atuais) => ({ ...atuais, senha: '' })); setErroLogin('') }} aria-invalid={Boolean(errosCampo.senha)} aria-describedby={errosCampo.senha ? 'senha-erro' : undefined} className="h-full w-full bg-transparent text-sm text-ink outline-none placeholder:text-slate-400" />
              </div>
              {errosCampo.senha && <p id="senha-erro" className="mt-1.5 text-xs text-red-700" role="alert">{errosCampo.senha}</p>}
            </div>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                <input type="checkbox" checked={lembrarDeMim} onChange={(event) => setLembrarDeMim(event.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-navy focus:ring-primary" />
                Lembrar de mim
              </label>
              <button type="button" onClick={() => informarRecursoIndisponivel('A recuperação de senha')} className="font-semibold text-[#087eae] hover:text-navy">Esqueci minha senha</button>
            </div>

            {erroLogin && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-800" role="alert">{erroLogin}</p>}
            {aviso && <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-3 text-sm leading-5 text-sky-900" role="status">{aviso}</p>}

            <button type="submit" disabled={carregando} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c2639] focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:opacity-70">
              {carregando ? 'Entrando…' : 'Entrar'}
              {!carregando && <Icone tipo="arrow" className="h-5 w-5" />}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-600">Não tem uma conta?{' '}
            <button type="button" onClick={() => informarRecursoIndisponivel('O cadastro de cliente')} className="font-semibold text-[#087eae] hover:text-navy">Cadastre-se como cliente</button>
          </p>

          <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 sm:p-5" aria-label="Acessos de demonstração">
            <h3 className="text-xs font-semibold tracking-wide text-slate-600">ACESSOS DE DEMONSTRAÇÃO</h3>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {['Entrar como Cliente', 'Entrar como Admin'].map((texto) => (
                <button key={texto} type="button" onClick={() => informarRecursoIndisponivel('O acesso de demonstração')} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-navy transition hover:border-slate-300 hover:bg-slate-50">{texto}</button>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-4 text-slate-500">Credenciais de demonstração não configuradas neste ambiente.</p>
          </section>
        </div>
      </section>
    </main>
  )
}
