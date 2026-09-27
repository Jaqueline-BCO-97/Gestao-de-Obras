import { useEffect, useState } from 'react'
import Button from '../../components/Button.jsx'
import Input from '../../components/Input.jsx'
import { buscarUsuarioAtual, alterarSenha } from '../../services/auth.js'

const TOKEN_KEY = 'token'

const tiposUsuario = {
  CLIENTE: 'Cliente',
  COLABORADOR: 'Colaborador',
  ADMIN: 'Admin',
}

export default function Perfil() {
  const [usuario, setUsuario] = useState(null)
  const [carregandoPerfil, setCarregandoPerfil] = useState(true)
  const [erroPerfil, setErroPerfil] = useState('')
  const [campos, setCampos] = useState({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })
  const [mensagem, setMensagem] = useState(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let ativo = true

    buscarUsuarioAtual()
      .then((dados) => {
        if (ativo) setUsuario(dados)
      })
      .catch((erro) => {
        if (ativo) {
          setErroPerfil(erro.message)
          if (erro.status === 401) localStorage.removeItem(TOKEN_KEY)
        }
      })
      .finally(() => {
        if (ativo) setCarregandoPerfil(false)
      })

    return () => { ativo = false }
  }, [])

  function atualizarCampo(event) {
    setCampos((atuais) => ({ ...atuais, [event.target.name]: event.target.value }))
    setMensagem(null)
  }

  async function enviarTrocaSenha(event) {
    event.preventDefault()
    setMensagem(null)

    if (!campos.senhaAtual || !campos.novaSenha || !campos.confirmarSenha) {
      setMensagem({ tipo: 'erro', texto: 'Preencha todos os campos de senha.' })
      return
    }
    if (campos.novaSenha !== campos.confirmarSenha) {
      setMensagem({ tipo: 'erro', texto: 'A nova senha e a confirmação precisam ser iguais.' })
      return
    }

    setSalvando(true)
    try {
      const resultado = await alterarSenha(campos.senhaAtual, campos.novaSenha)
      setMensagem({ tipo: 'sucesso', texto: resultado.mensagem || 'Senha alterada com sucesso.' })
      setCampos({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: erro.message || 'Não foi possível alterar a senha.' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-slate-800 max-[620px]:flex-col">
      <aside className="sticky top-0 flex h-screen w-[216px] shrink-0 flex-col overflow-y-auto bg-navy px-3 py-[22px] pb-4 text-slate-200 max-[920px]:w-[190px] max-[620px]:static max-[620px]:h-auto max-[620px]:w-full max-[620px]:shrink-0 max-[620px]:px-[14px] max-[620px]:py-[13px]">
        <a className="inline-flex min-w-0 items-center gap-[10px] px-[5px] text-white no-underline max-[620px]:px-[2px]" href="/perfil" aria-label="ObraMaster, Perfil">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-xl font-bold" aria-hidden="true">⌂</span>
          <span className="min-w-0"><strong className="block text-[17px] leading-[1.1] tracking-[-.04em]">Obra<span className="text-sky-300">Master</span></strong><small className="mt-1 block text-[8px] tracking-[.12em] text-slate-400">GESTÃO DE OBRAS</small></span>
        </a>

        <nav className="mt-[34px] grid gap-[5px] max-[620px]:mt-[14px] max-[620px]:grid-cols-3 max-[620px]:gap-1 max-[360px]:grid-cols-2" aria-label="Menu do cliente">
          <div className="flex min-h-[39px] items-center gap-[11px] whitespace-nowrap rounded-[9px] px-[11px] text-xs font-medium text-slate-300 max-[620px]:min-w-0 max-[620px]:min-h-[35px] max-[620px]:gap-1.5 max-[620px]:px-[7px] max-[620px]:text-[10px] max-[360px]:gap-[5px]"><span className="grid w-[17px] shrink-0 place-items-center text-base leading-none text-slate-300">▦</span>Dashboard</div>
          <div className="flex min-h-[39px] items-center gap-[11px] whitespace-nowrap rounded-[9px] px-[11px] text-xs font-medium text-slate-300 max-[620px]:min-w-0 max-[620px]:min-h-[35px] max-[620px]:gap-1.5 max-[620px]:px-[7px] max-[620px]:text-[10px] max-[360px]:gap-[5px]"><span className="grid w-[17px] shrink-0 place-items-center text-base leading-none text-slate-300">▤</span>Meus Orçamentos</div>
          <div className="flex min-h-[39px] items-center gap-[11px] whitespace-nowrap rounded-[9px] px-[11px] text-xs font-medium text-slate-300 max-[620px]:min-w-0 max-[620px]:min-h-[35px] max-[620px]:gap-1.5 max-[620px]:px-[7px] max-[620px]:text-[10px] max-[360px]:gap-[5px]"><span className="grid w-[17px] shrink-0 place-items-center text-base leading-none text-slate-300">▣</span>Minhas Obras</div>
          <div className="flex min-h-[39px] items-center gap-[11px] whitespace-nowrap rounded-[9px] px-[11px] text-xs font-medium text-slate-300 max-[620px]:min-w-0 max-[620px]:min-h-[35px] max-[620px]:gap-1.5 max-[620px]:px-[7px] max-[620px]:text-[10px] max-[360px]:gap-[5px]"><span className="grid w-[17px] shrink-0 place-items-center text-base leading-none text-slate-300">◉</span>Pagamentos</div>
          <div className="flex min-h-[39px] items-center gap-[11px] whitespace-nowrap rounded-[9px] px-[11px] text-xs font-medium text-slate-300 max-[620px]:min-w-0 max-[620px]:min-h-[35px] max-[620px]:gap-1.5 max-[620px]:px-[7px] max-[620px]:text-[10px] max-[360px]:gap-[5px]"><span className="grid w-[17px] shrink-0 place-items-center text-base leading-none text-slate-300">♧</span>Notificações</div>
          <div className="flex min-h-[39px] items-center gap-[11px] whitespace-nowrap rounded-[9px] bg-primary px-[11px] text-xs font-bold text-white max-[620px]:min-w-0 max-[620px]:min-h-[35px] max-[620px]:gap-1.5 max-[620px]:px-[7px] max-[620px]:text-[10px] max-[360px]:gap-[5px]" aria-current="page"><span className="grid w-[17px] shrink-0 place-items-center text-base leading-none text-white">◎</span>Perfil</div>
        </nav>

        <div className="mt-auto px-[7px] pt-3 text-[9px] text-slate-400 max-[620px]:hidden">ObraMaster · Gestão de Obras</div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex min-h-[62px] items-center border-b border-slate-200 bg-white px-[clamp(22px,4vw,52px)] max-[620px]:min-h-[54px] max-[620px]:px-[18px]">
          <div className="grid gap-[3px]"><span className="text-[9px] font-bold tracking-[.08em] text-slate-500">MINHA CONTA</span><strong className="text-[13px] font-semibold text-navy">Perfil</strong></div>
        </header>

        <main className="mx-auto w-[min(1120px,calc(100%-64px))] py-7 max-[920px]:w-[min(720px,calc(100%-44px))] max-[620px]:w-[calc(100%-32px)] max-[620px]:py-[23px] max-[360px]:w-[calc(100%-24px)]">
          <div className="mb-[19px] max-[620px]:mb-4">
            <p className="mb-1.5 text-[9px] font-bold tracking-[.12em] text-slate-500">CONTA</p>
            <h1 className="m-0 text-[clamp(26px,3vw,30px)] font-bold leading-[1.2] tracking-[-.045em] text-navy">Meu perfil</h1>
            <p className="mt-[5px] text-xs text-slate-500">Consulte seus dados e mantenha sua conta segura.</p>
          </div>

          {carregandoPerfil ? (
            <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-[22px] text-slate-500 shadow-sm" role="status">Carregando seus dados…</section>
          ) : erroPerfil ? (
            <section className="min-w-0 rounded-xl border border-red-200 bg-white p-[22px] text-slate-500 shadow-sm" role="alert">
              <h2 className="m-0 text-[15px] text-navy">Não foi possível carregar seu perfil</h2>
              <p className="mt-[9px] text-xs leading-normal">{erroPerfil}</p>
            </section>
          ) : (
            <div className="grid grid-cols-2 items-start gap-[18px] max-[920px]:grid-cols-1 max-[920px]:gap-[15px]">
              <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-[21px_20px_20px] shadow-sm max-[620px]:p-[18px_16px]">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-[15px]">
                  <div><p className="mb-1 text-[9px] font-bold tracking-[.12em] text-slate-500">SEU CADASTRO</p><h2 className="m-0 text-[15px] font-bold text-navy">Dados pessoais e contato</h2></div>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-sky-50 text-[17px] text-sky-700" aria-hidden="true">◉</span>
                </div>
                <dl className="mt-4 grid gap-[13px]">
                  <div className="min-w-0"><dt className="mb-[5px] text-[11px] font-semibold text-slate-700">Nome</dt><dd className="m-0 min-h-[34px] overflow-wrap-anywhere rounded-[7px] border border-slate-300 bg-white px-[10px] py-2 text-xs leading-[1.35] text-slate-600 shadow-sm">{usuario.nome}</dd></div>
                  <div className="min-w-0"><dt className="mb-[5px] text-[11px] font-semibold text-slate-700">E-mail</dt><dd className="m-0 min-h-[34px] overflow-wrap-anywhere rounded-[7px] border border-slate-300 bg-white px-[10px] py-2 text-xs leading-[1.35] text-slate-600 shadow-sm">{usuario.email}</dd></div>
                  <div className="min-w-0"><dt className="mb-[5px] text-[11px] font-semibold text-slate-700">Tipo de usuário</dt><dd className="m-0 min-h-[34px] overflow-wrap-anywhere rounded-[7px] border border-slate-300 bg-white px-[10px] py-2 text-xs leading-[1.35] text-slate-600 shadow-sm"><span className="inline-flex min-h-[23px] items-center rounded-full border border-sky-200 bg-sky-50 px-[9px] py-[3px] text-[10px] font-bold text-sky-700">{tiposUsuario[usuario.tipo] || usuario.tipo}</span></dd></div>
                </dl>
                <p className="mt-[15px] flex items-center gap-[7px] text-[10px] text-slate-500"><span className="font-extrabold text-emerald-700" aria-hidden="true">✓</span> Estas informações pertencem à sua conta.</p>
              </section>

              <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-[21px_20px_20px] shadow-sm max-[620px]:p-[18px_16px]">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-[15px]">
                  <div><p className="mb-1 text-[9px] font-bold tracking-[.12em] text-slate-500">SEGURANÇA</p><h2 className="m-0 text-[15px] font-bold text-navy max-[360px]:text-sm">Alteração de senha</h2></div>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-sky-50 text-[17px] text-sky-700" aria-hidden="true">⌑</span>
                </div>
                <p className="my-[13px] mb-4 text-[11px] leading-[1.5] text-slate-500">Use sua senha atual para definir uma nova senha de acesso.</p>
                <form className="[&>div]:mb-3 [&_label]:mb-[5px] [&_label]:text-[11px] [&_label]:font-semibold [&_label]:text-slate-700 [&>div>div]:min-h-[34px] [&>div>div]:rounded-[7px] [&>div>div]:border-slate-300 [&>div>div]:px-[10px] [&>div>div]:py-[6px] [&>div>div]:shadow-sm [&>div>div:focus-within]:border-primary [&_input]:min-h-5 [&_input]:text-xs [&_input]:text-slate-700" onSubmit={enviarTrocaSenha} noValidate>
                  <Input label="Senha atual" type="password" name="senhaAtual" autoComplete="current-password" value={campos.senhaAtual} onChange={atualizarCampo} required />
                  <Input label="Nova senha" type="password" name="novaSenha" autoComplete="new-password" value={campos.novaSenha} onChange={atualizarCampo} required />
                  <Input label="Confirmar nova senha" type="password" name="confirmarSenha" autoComplete="new-password" value={campos.confirmarSenha} onChange={atualizarCampo} required />
                  {mensagem && <p className={`mb-3 rounded-[7px] px-[10px] py-[9px] text-[11px] leading-[1.45] ${mensagem.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`} role={mensagem.tipo === 'erro' ? 'alert' : 'status'}>{mensagem.texto}</p>}
                  <Button type="submit" disabled={salvando} className="!min-h-9 !rounded-[7px] !bg-navy !px-[14px] !py-0 !text-[11px] !shadow-sm hover:!bg-sky-900 disabled:!cursor-wait disabled:!opacity-70">{salvando ? 'Salvando…' : 'Alterar senha'}<span aria-hidden="true">→</span></Button>
                </form>
              </section>
            </div>
          )}
          <footer className="mt-[25px] text-[9px] text-slate-400">ObraMaster © {new Date().getFullYear()} · Sistema de gestão de obras</footer>
        </main>
      </div>
    </div>
  )
}
