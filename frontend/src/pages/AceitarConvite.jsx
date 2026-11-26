// Importa os hooks necessários para carregar e validar o convite.
import { useEffect, useState } from 'react'
// Importa links e navegação do roteador já usado pelo sistema.
import { Link, useNavigate, useParams } from 'react-router-dom'
// Importa as ações da API e as funções atuais de sessão.
import { aceitarConvite, consultarConvite, salvarSessao, obterToken } from '../services/auth.js'
// Importa a regra compartilhada que valida a confirmação das senhas.
import { senhasConferem } from '../utils/convite.js'

// Renderiza a página pública de aceite dos convites de cliente e gerente.
export default function AceitarConvite() {
  // Lê o token único que identifica o convite na URL.
  const { token } = useParams()
  // Guarda os dados públicos recebidos do convite.
  const [convite, setConvite] = useState(null)
  // Guarda mensagens de validação ou erro retornadas pelo backend.
  const [erro, setErro] = useState('')
  // Guarda falhas que impedem a consulta inicial do convite.
  const [erroCarregamento, setErroCarregamento] = useState('')
  // Guarda o e-mail digitado para confirmar um convite de cliente.
  const [email, setEmail] = useState('')
  // Guarda a senha criada pela pessoa convidada.
  const [senha, setSenha] = useState('')
  // Guarda a confirmação da senha criada pela pessoa convidada.
  const [confirmarSenha, setConfirmarSenha] = useState('')
  // Indica se a consulta ou o envio do convite está em andamento.
  const [carregando, setCarregando] = useState(true)
  // Obtém a função de navegação para abrir o Perfil após o aceite.
  const navigate = useNavigate()
  // Detecta se o navegador já possui uma sessão, preservando o fluxo de conta existente.
  const possuiSessao = Boolean(obterToken())
  // Exige e-mail e confirmação de senha apenas no cadastro anônimo de cliente.
  const exigeConfirmacaoCliente = convite?.tipo === 'CLIENTE' && !possuiSessao

  // Busca os dados públicos do convite quando a página abre ou o token muda.
  useEffect(() => {
    // Atualiza a tela com o convite ou registra o erro de consulta.
    consultarConvite(token).then(setConvite).catch((falha) => setErroCarregamento(falha.message)).finally(() => setCarregando(false))
  }, [token])

  // Valida os campos e envia o aceite do convite.
  async function enviar(event) {
    // Evita o envio HTML padrão para controlar a resposta na própria tela.
    event.preventDefault()
    // Limpa erro anterior antes de validar os novos dados.
    setErro('')
    // Indica que o envio está em andamento e evita cliques repetidos.
    setCarregando(true)
    // Bloqueia localmente senhas diferentes antes de chamar a API.
    if (exigeConfirmacaoCliente && !senhasConferem(senha, confirmarSenha)) {
      // Informa com clareza que os dois campos precisam coincidir.
      setErro('As senhas não coincidem.')
      // Libera o formulário novamente após a validação local.
      setCarregando(false)
      // Encerra sem chamar o backend quando as senhas são diferentes.
      return
    }
    // Continua com o envio somente após passar pela validação local.
    try {
      // Envia e-mail apenas no fluxo de cliente sem sessão.
      const sessao = await aceitarConvite(token, senha, exigeConfirmacaoCliente ? email : undefined)
      // Salva a sessão usando o mesmo armazenamento persistente de antes.
      salvarSessao(sessao, true)
      // Direciona clientes ao Perfil com uma mensagem transitória de boas-vindas.
      if (sessao.usuario.tipo === 'CLIENTE') {
        // Monta uma mensagem curta para a obra recém-vinculada.
        const mensagemBoasVindas = `Boas-vindas, ${sessao.usuario.nome}! A obra já está disponível no Início.`
        // Abre o Perfil e passa a mensagem somente pelo estado temporário da navegação.
        navigate('/perfil', { state: { mensagemBoasVindas } })
      } else {
        // Mantém o destino atual do fluxo de gerente.
        navigate('/colaborador')
      }
    } catch (falha) {
      // Exibe o erro da API sem revelar dados privados do convite.
      setErro(falha.message)
    } finally {
      // Libera os campos após o sucesso ou erro do envio.
      setCarregando(false)
    }
  }

  // Renderiza os detalhes públicos e o formulário compatível com cada tipo de convite.
  return (
    // Mantém o contêiner e o estilo visual já usados pela página de aceite.
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      {/* Centraliza o cartão de convite no conteúdo da página. */}
      <section className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow">
        {/* Mantém o link atual para a tela de login. */}
        <Link to="/login" className="text-sm text-sky-700">ObraMaster</Link>
        {/* Apresenta o título da ação atual. */}
        <h1 className="mt-4 text-2xl font-bold text-[#0c2d43]">Convite para acessar uma obra</h1>
        {/* Informa que o convite está sendo consultado. */}
        {carregando && <p role="status" className="mt-4">Carregando convite…</p>}
        {/* Mostra um erro quando o link não pôde ser consultado. */}
        {erroCarregamento && !convite && <div role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800">{erroCarregamento}<p className="mt-2"><Link to="/login" className="font-semibold underline">Voltar ao login</Link></p></div>}
        {/* Exibe os dados de contexto quando o convite foi carregado. */}
        {convite && (
          // Agrupa o resumo e os controles de aceite.
          <>
            {/* Mostra empresa, nome convidado e obra sem expor o e-mail de cliente. */}
            <p className="mt-4 text-sm text-slate-700">
              A empreiteira <strong>{convite.empresa}</strong> convidou <strong>{convite.nome}</strong>
              {convite.tipo === 'CLIENTE'
                ? convite.obra
                  ? <> para acompanhar a obra <strong>{convite.obra}</strong>.</>
                  : <> para se cadastrar como cliente e acompanhar as obras vinculadas à sua conta.</>
                : <> como gerente responsável pela obra <strong>{convite.obra}</strong> ({convite.email}).</>}
            </p>
            {/* Preserva as mensagens específicas de convite expirado ou usado. */}
            {(convite.expirado || convite.usado)
              ? <p className="mt-4 text-sm text-red-700">Este convite {convite.usado ? 'já foi utilizado' : 'expirou'}. Peça à empreiteira um novo link.</p>
              : (
                // Mantém o formulário disponível somente para convites ainda válidos.
                <form onSubmit={enviar} className="mt-5 space-y-3">
                  {/* Preserva a orientação para quem já possui uma conta. */}
                  <p className="text-xs text-slate-600">Se você já tem uma conta, <Link to="/login" className="text-sky-700 underline">entre primeiro</Link> e volte a este link. Caso contrário, confirme seus dados e crie sua senha.</p>
                  {/* Solicita e-mail digitado apenas para cliente sem sessão, sem preenchimento automático. */}
                  {exigeConfirmacaoCliente && <label className="block text-sm font-medium">Confirme seu e-mail{convite.emailDica && <span className="ml-1 font-normal text-slate-500">(dica: {convite.emailDica})</span>}<input required type="email" name="confirmarEmail" autoComplete="off" value={email} onChange={(event) => { setEmail(event.target.value); setErro('') }} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>}
                  {/* Pede uma senha com o mínimo já exigido no backend. */}
                  {!possuiSessao && <label className="block text-sm font-medium">Crie sua senha<input required minLength={8} type="password" name="senha" autoComplete="new-password" value={senha} onChange={(event) => { setSenha(event.target.value); setErro('') }} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>}
                  {/* Confirma a senha somente para o novo cadastro de cliente. */}
                  {exigeConfirmacaoCliente && <label className="block text-sm font-medium">Confirmar senha<input required minLength={8} type="password" name="confirmarSenha" autoComplete="new-password" value={confirmarSenha} onChange={(event) => { setConfirmarSenha(event.target.value); setErro('') }} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>}
                  {/* Exibe erros genéricos ou de validação sem mostrar o e-mail completo do convite. */}
                  {erro && <p role="alert" className="rounded bg-red-50 p-3 text-sm font-semibold text-red-800">{erro}</p>}
                  {/* Envia o aceite e impede novo envio enquanto a API responde. */}
                  <button disabled={carregando} className="w-full rounded-lg bg-[#0c2d43] p-3 font-semibold text-white">Aceitar convite</button>
                </form>
              )}
          </>
        )}
      </section>
    </main>
  )
}
