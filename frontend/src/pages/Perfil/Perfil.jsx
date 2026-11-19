import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/Button.jsx'
import Input from '../../components/Input.jsx'
import { atualizarPerfil, buscarUsuarioAtual, alterarSenha, encerrarSessao, salvarSessao } from '../../services/auth.js'
import { obterRotaDashboard } from '../../routes/dashboardRoutes.js'

// Função auxiliar para recuperar dados do usuário mock/local quando a API estiver offline
function obterUsuarioLocal() {
  try {
    const dados = localStorage.getItem('usuario') || sessionStorage.getItem('usuario')
    return dados ? JSON.parse(dados) : null
  } catch {
    return null
  }
}

// Chave usada no localStorage pra guardar o token JWT do usuário logado.

// Tradução do enum TipoUsuario (que vem do banco em maiúsculas, tipo "ADMIN")
// pra um texto mais bonito de mostrar na tela, tipo "Admin".
export default function Perfil() {
  // Hook de navegação do React Router para transicionar de rota sem recarregar a tela
  const navigate = useNavigate()

  // Dados do usuário logado (nome, email, tipo), inicializados a partir do armazenamento local ou nulos
  const [usuario, setUsuario] = useState(() => obterUsuarioLocal())

  // Identifica o perfil do usuário atual para descobrir a rota do seu dashboard
  const tipoPerfil = usuario?.tipo || obterUsuarioLocal()?.tipo
  // Rota de retorno correspondente ao perfil logado (Admin -> /admin, Cliente -> /cliente, Colaborador -> /colaborador)
  const rotaDashboard = obterRotaDashboard(tipoPerfil) || '/login'

  // Controla se ainda está esperando a resposta do /auth/me.
  const [carregandoPerfil, setCarregandoPerfil] = useState(true)

  // Guarda uma mensagem de erro, caso o /auth/me falhe (ex: token inválido).
  const [erroPerfil, setErroPerfil] = useState('')

  // Os 3 campos do formulário de troca de senha.
  const [campos, setCampos] = useState({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })

  // Mensagem de sucesso ou erro mostrada depois de tentar trocar a senha.
  // Formato: { tipo: 'erro' | 'sucesso', texto: '...' }
  const [mensagem, setMensagem] = useState(null)

  // true enquanto a requisição de troca de senha está em andamento
  // (usado pra desabilitar o botão e mostrar "Salvando…").
  const [salvando, setSalvando] = useState(false)
  const [dadosContato, setDadosContato] = useState({ email: '', telefone: '', telefoneSecundario: '' })
  const [fotoSelecionada, setFotoSelecionada] = useState(null)

  // Roda uma única vez, quando o componente é montado na tela,
  // pra buscar os dados do usuário logado.
  useEffect(() => {
    // Flag pra evitar atualizar o estado se o componente já tiver saído
    // da tela antes da resposta chegar (evita warning do React).
    let ativo = true

    buscarUsuarioAtual()
      .then((dados) => {
        if (ativo) { setUsuario(dados); setDadosContato({ email: dados.email || '', telefone: dados.telefone || '', telefoneSecundario: dados.telefoneSecundario || '' }) }
      })
      .catch((erro) => {
        if (ativo) {
          // Se já houver usuário na sessão local (modo mock / demonstração), usa os dados locais
          const dadosLocais = obterUsuarioLocal()
          if (dadosLocais) {
            setUsuario(dadosLocais)
          } else {
            setErroPerfil(erro.message)
            // Se o erro for 401 (não autorizado), o token guardado é inválido — apaga ele
            if (erro.status === 401) encerrarSessao()
          }
        }
      })
      .finally(() => {
        if (ativo) setCarregandoPerfil(false)
      })

    // "Cleanup": roda se o componente sair da tela antes da Promise terminar.
    return () => { ativo = false }
  }, [])

  // Atualiza o campo do formulário que o usuário está digitando
  // (usa o "name" do input pra saber qual campo é: senhaAtual, novaSenha, etc).
  function atualizarCampo(event) {
    setCampos((atuais) => ({ ...atuais, [event.target.name]: event.target.value }))
    // Limpa qualquer mensagem de erro/sucesso antiga assim que o usuário
    // começa a digitar de novo.
    setMensagem(null)
  }

  // Chamado quando o formulário de troca de senha é enviado.
  async function enviarTrocaSenha(event) {
    event.preventDefault() // impede o navegador de recarregar a página
    setMensagem(null)

    // Validação básica no front, antes de gastar uma chamada ao backend.
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
      // Chama o endpoint PATCH /usuarios/me/senha (dentro de auth.js).
      const resultado = await alterarSenha(campos.senhaAtual, campos.novaSenha)
      setMensagem({ tipo: 'sucesso', texto: resultado.mensagem || 'Senha alterada com sucesso.' })
      // Limpa os campos depois de trocar com sucesso, por segurança.
      setCampos({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })
    } catch (erro) {
      // Se o backend recusar (ex: senha atual errada), mostra a mensagem dele.
      setMensagem({ tipo: 'erro', texto: erro.message || 'Não foi possível alterar a senha.' })
    } finally {
      setSalvando(false)
    }
  }

  async function salvarContato(event) {
    event.preventDefault()
    setMensagem(null)
    setSalvando(true)
    try {
      const dados = { ...dadosContato }
      if (fotoSelecionada) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(fotoSelecionada.type) || fotoSelecionada.size > 5 * 1024 * 1024) throw new Error('Escolha uma foto JPG, PNG ou WebP de até 5 MB.')
        dados.foto = await new Promise((resolve, reject) => { const leitor = new FileReader(); leitor.onload = () => resolve({ data: leitor.result, mimeType: fotoSelecionada.type }); leitor.onerror = () => reject(new Error('Não foi possível ler a foto.')); leitor.readAsDataURL(fotoSelecionada) })
      }
      const resposta = await atualizarPerfil(dados)
      const lembrar = Boolean(localStorage.getItem('token'))
      salvarSessao(resposta, lembrar)
      setUsuario(resposta.usuario)
      setDadosContato({ email: resposta.usuario.email || '', telefone: resposta.usuario.telefone || '', telefoneSecundario: resposta.usuario.telefoneSecundario || '' })
      setFotoSelecionada(null)
      setMensagem({ tipo: 'sucesso', texto: resposta.mensagem || 'Perfil atualizado.' })
    } catch (erro) { setMensagem({ tipo: 'erro', texto: erro.message || 'Não foi possível atualizar o perfil.' }) }
    finally { setSalvando(false) }
  }

  const itensMenu = tipoPerfil === 'ADMIN'
    ? [{ to: '/admin/notificacoes', label: 'Notificações', icon: '♧' }, { to: '/admin/pagamentos', label: 'Pagamentos', icon: '◉' }, { to: '/perfil', label: 'Perfil', icon: '◎' }]
    : tipoPerfil === 'CLIENTE'
      ? [{ to: '/cliente', label: 'Minhas Obras', icon: '▣' }, { to: '/cliente/pagamentos', label: 'Pagamentos', icon: '◉' }, { to: '/cliente/notificacoes', label: 'Notificações', icon: '♧' }, { to: '/cliente/contratos', label: 'Contrato', icon: '▤' }, { to: '/perfil', label: 'Perfil', icon: '◎' }]
      : [{ to: '/colaborador', label: 'Minhas Obras', icon: '▣' }, { to: '/colaborador/notificacoes', label: 'Notificações', icon: '♧' }, { to: '/perfil', label: 'Perfil', icon: '◎' }]

  return (
    // Layout geral: sidebar fixa à esquerda + conteúdo à direita.
    // Em telas até 620px (celular), vira coluna (sidebar em cima, conteúdo embaixo).
    <div className="flex min-h-screen bg-background text-slate-800 max-[620px]:flex-col">

      {/* ---------- SIDEBAR (menu lateral) ---------- */}
      <aside className="sticky top-0 flex h-screen w-[216px] shrink-0 flex-col overflow-y-auto bg-navy px-3 py-[22px] pb-4 text-slate-200 max-[920px]:w-[190px] max-[620px]:static max-[620px]:h-auto max-[620px]:w-full max-[620px]:shrink-0 max-[620px]:px-[14px] max-[620px]:py-[13px]">

        {/* Logo/marca do ObraMaster, também funciona como link pro perfil */}
        <Link className="inline-flex min-w-0 items-center gap-[10px] px-[5px] text-white no-underline max-[620px]:px-[2px]" to={tipoPerfil === 'ADMIN' ? '/admin' : rotaDashboard} aria-label="ObraMaster">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-xl font-bold" aria-hidden="true">⌂</span>
          <span className="min-w-0"><strong className="block text-[17px] leading-[1.1] tracking-[-.04em]">Obra<span className="text-sky-300">Master</span></strong><small className="mt-1 block text-[8px] tracking-[.12em] text-slate-400">GESTÃO DE OBRAS</small></span>
        </Link>

        <nav className="mt-[34px] grid gap-[5px] max-[620px]:mt-[14px] max-[620px]:grid-cols-3 max-[620px]:gap-1 max-[360px]:grid-cols-2" aria-label="Navegação da conta">
          {itensMenu.map((item) => <Link key={item.to} to={item.to} aria-current={item.to === '/perfil' ? 'page' : undefined} className={`flex min-h-[39px] items-center gap-[11px] whitespace-nowrap rounded-[9px] px-[11px] text-xs max-[620px]:min-w-0 max-[620px]:min-h-[35px] max-[620px]:gap-1.5 max-[620px]:px-[7px] max-[620px]:text-[10px] ${item.to === '/perfil' ? 'bg-primary font-bold text-white' : 'font-medium text-slate-300 hover:bg-white/10'}`}><span className="grid w-[17px] shrink-0 place-items-center text-base leading-none">{item.icon}</span>{item.label}</Link>)}
        </nav>

        <div className="mt-auto px-[7px] pt-3 text-[9px] text-slate-400 max-[620px]:hidden">ObraMaster · Gestão de Obras</div>
      </aside>

      {/* ---------- CONTEÚDO PRINCIPAL ---------- */}
      <div className="min-w-0 flex-1">

        {/* Barra superior com o texto "MINHA CONTA" e o botão "← Voltar" visível tanto no desktop quanto no celular */}
        <header className="flex min-h-[62px] items-center justify-between border-b border-slate-200 bg-white px-[clamp(22px,4vw,52px)] max-[620px]:min-h-[54px] max-[620px]:px-[18px]">
          {/* Identificação da página */}
          <div className="grid gap-[3px]">
            <span className="text-[9px] font-bold tracking-[.08em] text-slate-500">MINHA CONTA</span>
            <strong className="text-[13px] font-semibold text-navy">Perfil</strong>
          </div>
          {/* Botão de retorno que leva diretamente ao dashboard do perfil logado (Cliente, Admin ou Colaborador) */}
          <Button variant="outline" onClick={() => navigate(tipoPerfil === 'ADMIN' ? '/admin' : rotaDashboard)} className="text-xs py-1.5 px-3">← Voltar</Button>
        </header>

        <main className="mx-auto w-[min(1120px,calc(100%-64px))] py-7 max-[920px]:w-[min(720px,calc(100%-44px))] max-[620px]:w-[calc(100%-32px)] max-[620px]:py-[23px] max-[360px]:w-[calc(100%-24px)]">
          <div className="mb-[19px] max-[620px]:mb-4">
            <p className="mb-1.5 text-[9px] font-bold tracking-[.12em] text-slate-500">CONTA</p>
            <h1 className="m-0 text-[clamp(26px,3vw,30px)] font-bold leading-[1.2] tracking-[-.045em] text-navy">Meu perfil</h1>
            <p className="mt-[5px] text-xs text-slate-500">Consulte seus dados e mantenha sua conta segura.</p>
          </div>

          {/* Renderização condicional: mostra "carregando", depois erro
              (se o /auth/me falhar), e só desenha os painéis de verdade
              quando os dados do usuário já chegaram. */}
          {carregandoPerfil ? (
            <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-[22px] text-slate-500 shadow-sm" role="status">Carregando seus dados…</section>
          ) : erroPerfil ? (
            <section className="min-w-0 rounded-xl border border-red-200 bg-white p-[22px] text-slate-500 shadow-sm" role="alert">
              <h2 className="m-0 text-[15px] text-navy">Não foi possível carregar seu perfil</h2>
              <p className="mt-[9px] text-xs leading-normal">{erroPerfil}</p>
            </section>
          ) : (
            <div className="grid grid-cols-2 items-start gap-[18px] max-[920px]:grid-cols-1 max-[920px]:gap-[15px]">

              {/* ---- Painel 1: contato e foto ---- */}
              <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-[21px_20px_20px] shadow-sm max-[620px]:p-[18px_16px]">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-[15px]">
                  <div><p className="mb-1 text-[9px] font-bold tracking-[.12em] text-slate-500">SEU CADASTRO</p><h2 className="m-0 text-[15px] font-bold text-navy">Dados pessoais e contato</h2></div>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-sky-50 text-[17px] text-sky-700" aria-hidden="true">◉</span>
                </div>
                <form onSubmit={salvarContato} className="mt-4 space-y-3">
                  <p className="text-sm font-semibold text-navy">{usuario.nome}</p>
                  {usuario.fotoUrl && <img src={usuario.fotoUrl} alt={`Foto de ${usuario.nome}`} className="h-20 w-20 rounded-full object-cover" />}
                  <label className="block text-[11px] font-semibold text-slate-700">Foto de perfil (JPG, PNG ou WebP)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFotoSelecionada(event.target.files?.[0] || null)} className="mt-1 block w-full rounded border border-slate-300 p-2 text-xs font-normal" /></label>
                  <label className="block text-[11px] font-semibold text-slate-700">E-mail<input required type="email" value={dadosContato.email} onChange={(event) => setDadosContato({ ...dadosContato, email: event.target.value })} className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal" /></label>
                  <label className="block text-[11px] font-semibold text-slate-700">Telefone<input type="tel" value={dadosContato.telefone} onChange={(event) => setDadosContato({ ...dadosContato, telefone: event.target.value })} className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal" /></label>
                  <label className="block text-[11px] font-semibold text-slate-700">Telefone adicional<input type="tel" value={dadosContato.telefoneSecundario} onChange={(event) => setDadosContato({ ...dadosContato, telefoneSecundario: event.target.value })} className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal" /></label>
                  {usuario.tipo === 'COLABORADOR' && usuario.funcionario?.funcao && <p className="text-xs text-slate-600">Função: <strong>{usuario.funcionario.funcao}</strong></p>}
                  {mensagem && <p className={`rounded-[7px] px-[10px] py-[9px] text-[11px] ${mensagem.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`} role={mensagem.tipo === 'erro' ? 'alert' : 'status'}>{mensagem.texto}</p>}
                  <Button type="submit" variant="compact" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar dados de contato'}</Button>
                </form>
              </section>

              {/* ---- Painel 2: formulário de troca de senha ---- */}
              <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-[21px_20px_20px] shadow-sm max-[620px]:p-[18px_16px]">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-[15px]">
                  <div><p className="mb-1 text-[9px] font-bold tracking-[.12em] text-slate-500">SEGURANÇA</p><h2 className="m-0 text-[15px] font-bold text-navy max-[360px]:text-sm">Alteração de senha</h2></div>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-sky-50 text-[17px] text-sky-700" aria-hidden="true">⌑</span>
                </div>
                <p className="my-[13px] mb-4 text-[11px] leading-[1.5] text-slate-500">Use sua senha atual para definir uma nova senha de acesso.</p>

                {/* Antes, essa tag <form> tinha um className gigante com
                    seletores tipo [&_input] e [&>div>div] que "invadiam"
                    a estrutura interna do Input pra estilizar. Agora que o
                    Input.jsx aceita className/fieldClassName como prop,
                    o form fica limpo e cada Input recebe o estilo direto. */}
                <form onSubmit={enviarTrocaSenha} noValidate>
                  <Input
                    label="Senha atual"
                    type="password"
                    name="senhaAtual"
                    autoComplete="current-password"
                    value={campos.senhaAtual}
                    onChange={atualizarCampo}
                    required
                    className="mb-3" // espaçamento externo (era o "[&>div]:mb-3")
                    fieldClassName="min-h-[34px] rounded-[7px]" // caixa do input (era o "[&>div>div]:...")
                  />
                  <Input
                    label="Nova senha"
                    type="password"
                    name="novaSenha"
                    autoComplete="new-password"
                    value={campos.novaSenha}
                    onChange={atualizarCampo}
                    required
                    className="mb-3"
                    fieldClassName="min-h-[34px] rounded-[7px]"
                  />
                  <Input
                    label="Confirmar nova senha"
                    type="password"
                    name="confirmarSenha"
                    autoComplete="new-password"
                    value={campos.confirmarSenha}
                    onChange={atualizarCampo}
                    required
                    className="mb-3"
                    fieldClassName="min-h-[34px] rounded-[7px]"
                  />

                  {/* Mensagem de sucesso ou erro da troca de senha —
                      a cor muda dependendo do tipo (vermelho pra erro,
                      verde pra sucesso). */}
                  {mensagem && <p className={`mb-3 rounded-[7px] px-[10px] py-[9px] text-[11px] leading-[1.45] ${mensagem.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`} role={mensagem.tipo === 'erro' ? 'alert' : 'status'}>{mensagem.texto}</p>}

                  {/* Antes usava um monte de "!important" pra forçar o
                      visual. Agora usa a variante "compact" que já existe
                      pronta no Button.jsx. */}
                  <Button type="submit" variant="compact" disabled={salvando} className="mt-1">
                    {salvando ? 'Salvando…' : 'Alterar senha'}<span aria-hidden="true">→</span>
                  </Button>
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
