import { useEffect, useState } from 'react'
import Button from '../../components/Button.jsx'
import Input from '../../components/Input.jsx'
import { buscarUsuarioAtual, alterarSenha } from '../../services/auth.js'
import './Perfil.css'

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
    <div className="profile-shell">
      <header className="topbar">
        <a className="brand" href="/perfil" aria-label="ObraMaster, Meu perfil">
          <span className="brand-mark" aria-hidden="true">⌂</span>
          <span><strong>Obra<span>Master</span></strong><small>GESTÃO DE OBRAS</small></span>
        </a>
        <nav aria-label="Navegação principal"><a className="nav-current" href="/perfil">Meu perfil</a></nav>
      </header>

      <main className="profile-main">
        <div className="page-heading">
          <div className="avatar" aria-hidden="true">{usuario?.nome?.trim()?.charAt(0)?.toUpperCase() || ' '}</div>
          <div><p className="eyebrow">CONTA</p><h1>Meu perfil</h1><p className="heading-copy">Consulte seus dados e mantenha sua conta segura.</p></div>
        </div>

        {carregandoPerfil ? (
          <section className="notice-card" role="status">Carregando seus dados…</section>
        ) : erroPerfil ? (
          <section className="notice-card error-card" role="alert">
            <h2>Não foi possível carregar seu perfil</h2>
            <p>{erroPerfil}</p>
          </section>
        ) : (
          <div className="profile-grid">
            <section className="panel personal-panel">
              <div className="panel-heading"><div><p className="eyebrow">SEU CADASTRO</p><h2>Informações pessoais</h2></div><span className="panel-icon" aria-hidden="true">◉</span></div>
              <dl className="details-list">
                <div className="detail-row"><dt>Nome</dt><dd>{usuario.nome}</dd></div>
                <div className="detail-row"><dt>E-mail</dt><dd>{usuario.email}</dd></div>
                <div className="detail-row"><dt>Tipo de usuário</dt><dd><span className="role-badge">{tiposUsuario[usuario.tipo] || usuario.tipo}</span></dd></div>
              </dl>
              <p className="private-note"><span aria-hidden="true">✓</span> Estas informações pertencem à sua conta.</p>
            </section>

            <section className="panel password-panel">
              <div className="panel-heading"><div><p className="eyebrow">SEGURANÇA</p><h2>Alterar senha</h2></div><span className="panel-icon" aria-hidden="true">⌑</span></div>
              <p className="section-copy">Use sua senha atual para definir uma nova senha de acesso.</p>
              <form onSubmit={enviarTrocaSenha} noValidate>
                <Input label="Senha atual" type="password" name="senhaAtual" autoComplete="current-password" value={campos.senhaAtual} onChange={atualizarCampo} required />
                <Input label="Nova senha" type="password" name="novaSenha" autoComplete="new-password" value={campos.novaSenha} onChange={atualizarCampo} required />
                <Input label="Confirmar nova senha" type="password" name="confirmarSenha" autoComplete="new-password" value={campos.confirmarSenha} onChange={atualizarCampo} required />
                {mensagem && <p className={`form-message ${mensagem.tipo}`} role={mensagem.tipo === 'erro' ? 'alert' : 'status'}>{mensagem.texto}</p>}
                <Button type="submit" disabled={salvando} className="submit-button">{salvando ? 'Salvando…' : 'Alterar senha'}<span aria-hidden="true">→</span></Button>
              </form>
            </section>
          </div>
        )}
        <footer className="page-footer">ObraMaster © {new Date().getFullYear()} · Sistema de gestão de obras</footer>
      </main>
    </div>
  )
}
