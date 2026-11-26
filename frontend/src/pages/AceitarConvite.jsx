// Importa os hooks necessários para carregar o convite e acompanhar os campos.
import { useEffect, useState } from 'react'
// Importa links e navegação do roteador já usado pelo sistema.
import { Link, useNavigate, useParams } from 'react-router-dom'
// Importa as ações da API e as funções atuais de sessão.
import { aceitarConvite, consultarConvite, salvarSessao, obterToken } from '../services/auth.js'
// Importa as regras locais de senha e confirmação usadas pelo formulário.
import { avaliarSenhaConvite, obterDadosConviteGerente, senhasConferem } from '../utils/convite.js'

// Renderiza a página pública de aceite dos convites de cliente e gerente.
export default function AceitarConvite() {
  // Lê o token único que identifica o convite na URL.
  const { token } = useParams()
  // Guarda os dados públicos recebidos do convite.
  const [convite, setConvite] = useState(null)
  // Guarda mensagens gerais de validação ou erro retornadas pelo backend.
  const [erro, setErro] = useState('')
  // Guarda erros de confirmação diretamente junto ao campo de e-mail.
  const [erroEmail, setErroEmail] = useState('')
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
  // Apresenta o convite especial somente para gerente que ainda vai criar conta.
  const exigeApresentacaoGerente = convite?.tipo === 'GERENTE' && !possuiSessao
  // Avalia em tempo real os requisitos aplicáveis a qualquer senha nova por convite.
  const avaliacaoSenha = avaliarSenhaConvite(senha)
  // Prepara fallbacks seguros para dados ausentes no convite de gerente.
  const dadosGerente = obterDadosConviteGerente(convite || {})
  // Usa textos neutros se um campo de identificação não vier no GET.
  const nomeCliente = typeof convite?.nome === 'string' && convite.nome.trim() ? convite.nome.trim() : 'convidado(a)'
  // Usa um texto neutro se o nome da empresa não vier no GET.
  const nomeEmpresa = typeof convite?.empresa === 'string' && convite.empresa.trim() ? convite.empresa.trim() : 'sua empresa'
  // Usa um texto neutro se o nome da obra não vier no GET.
  const nomeObra = typeof convite?.obra === 'string' && convite.obra.trim() ? convite.obra.trim() : 'sua obra'

  // Busca os dados públicos do convite quando a página abre ou o token muda.
  useEffect(() => {
    // Atualiza a tela com o convite ou registra o erro de consulta.
    consultarConvite(token).then(setConvite).catch((falha) => setErroCarregamento(falha.message)).finally(() => setCarregando(false))
  }, [token])

  // Valida os campos e envia o aceite do convite.
  async function enviar(event) {
    // Evita o envio HTML padrão para controlar as respostas na própria tela.
    event.preventDefault()
    // Limpa erros anteriores antes de validar os valores atuais.
    setErro('')
    // Limpa erro de e-mail anterior antes de uma nova tentativa.
    setErroEmail('')
    // Indica que o envio está em andamento e evita cliques repetidos.
    setCarregando(true)
    // Exige e-mail digitado somente para cliente sem sessão.
    if (exigeConfirmacaoCliente && !email.trim()) {
      // Informa junto ao campo que o endereço do convite é obrigatório.
      setErroEmail('Informe o e-mail do convite.')
      // Libera o formulário depois da validação local.
      setCarregando(false)
      // Encerra sem chamar a API quando o e-mail está vazio.
      return
    }
    // Bloqueia localmente confirmações diferentes antes de chamar a API.
    if (exigeConfirmacaoCliente && !senhasConferem(senha, confirmarSenha)) {
      // Exibe uma mensagem própria em português para a divergência das senhas.
      setErro('As senhas não coincidem.')
      // Libera o formulário depois da validação local.
      setCarregando(false)
      // Encerra sem chamada de rede quando as senhas não coincidem.
      return
    }
    // Aplica a política somente quando a pessoa está criando uma senha nova.
    if (!possuiSessao && !avaliacaoSenha.valida) {
      // Exibe a primeira regra pendente em português.
      setErro(avaliacaoSenha.erro)
      // Libera o formulário depois da validação local.
      setCarregando(false)
      // Encerra sem chamar a API quando a senha não atende às regras.
      return
    }
    // Continua com o envio somente após passar pelas validações locais.
    try {
      // Envia e-mail apenas no fluxo de cliente sem sessão.
      const sessao = await aceitarConvite(token, senha, exigeConfirmacaoCliente ? email : undefined)
      // Salva a sessão usando o mesmo armazenamento persistente de antes.
      salvarSessao(sessao, true)
      // Direciona clientes ao Perfil com a mensagem temporária de boas-vindas existente.
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
      // Converte a divergência de e-mail para uma mensagem junto ao campo correspondente.
      if (falha.codigo === 'EMAIL_CONVITE_DIVERGENTE') setErroEmail('O e-mail informado não confere com o do convite. Confira o endereço e tente novamente.')
      // Converte a ausência de e-mail em orientação junto ao campo correspondente.
      else if (falha.codigo === 'EMAIL_CONVITE_OBRIGATORIO') setErroEmail('Informe o e-mail do convite.')
      // Mostra os demais erros sem expor o endereço verdadeiro do convite.
      else setErro(falha.message)
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
        {/* Informa que o convite está sendo consultado. */}
        {carregando && <p role="status" className="mt-4">Carregando convite…</p>}
        {/* Mostra um erro quando o link não pôde ser consultado. */}
        {erroCarregamento && !convite && <div role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800">{erroCarregamento}<p className="mt-2"><Link to="/login" className="font-semibold underline">Voltar ao login</Link></p></div>}
        {/* Exibe o convite somente depois de consultar os dados públicos. */}
        {convite && (
          // Agrupa o resumo, estado e controles de aceite.
          <>
            {/* Usa o convite de equipe somente para gerente sem sessão. */}
            {exigeApresentacaoGerente ? (
              // Exibe os dados de gerente vindos do GET sem revelar seu e-mail.
              <div className="mt-4 space-y-3">
                {/* Identifica a tela como convite de equipe do ObraMaster. */}
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">OBRAMASTER · CONVITE DE EQUIPE</p>
                {/* Apresenta o título atual do convite de gerente. */}
                <h1 className="text-2xl font-bold text-[#0c2d43]">Você foi convidado para fazer parte de uma obra!</h1>
                {/* Cumprimenta o convidado ou usa uma saudação neutra. */}
                <p className="text-sm text-slate-700">{dadosGerente.saudacao}</p>
                {/* Mostra a empresa sem inserir conteúdo HTML dinâmico. */}
                <p className="text-sm text-slate-700">{dadosGerente.empresaConvite} está convidando você para integrar sua equipe no ObraMaster e acompanhar a execução de uma obra.</p>
                {/* Agrupa obra e função no destaque visual já usado no convite de cliente. */}
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Detalhes do convite de equipe">
                  {/* Identifica a obra que a administração vinculou ao convite. */}
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">OBRA VINCULADA</p>
                  {/* Exibe a obra ou informa que o vínculo será feito depois. */}
                  <p className="mt-1 text-lg font-bold text-navy">{dadosGerente.obraVinculada}</p>
                  {/* Identifica a função definida para o gerente. */}
                  <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">SUA FUNÇÃO</p>
                  {/* Exibe a função informada ou o fallback administrativo. */}
                  <p className="mt-1 text-lg font-bold text-navy">{dadosGerente.funcaoConvidada}</p>
                  {/* Explica quem define as responsabilidades do cargo. */}
                  <p className="mt-1 text-sm text-slate-600">Responsabilidades definidas pela administração da empresa.</p>
                </section>
                {/* Resume o acesso oferecido sem ampliar as permissões atuais. */}
                <p className="text-sm text-slate-700">Com seu acesso, você poderá acompanhar e registrar as atividades relacionadas à obra, conforme as permissões da sua função.</p>
                {/* Orienta a criação da senha antes do formulário. */}
                <p className="text-sm text-slate-700">Crie sua senha para começar:</p>
              </div>
            ) : exigeConfirmacaoCliente ? (
              // Mostra o convite especial com nomes que vieram do GET.
              <div className="mt-4 space-y-3">
                {/* Exibe o rótulo pequeno solicitado para o aceite do cliente. */}
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">OBRAMASTER · CONVITE ESPECIAL</p>
                {/* Cumprimenta o nome recebido ou usa a alternativa neutra. */}
                <h1 className="text-2xl font-bold text-[#0c2d43]">Seja bem-vindo(a), {nomeCliente}!</h1>
                {/* Apresenta a mensagem de boas-vindas aprovada. */}
                <p className="text-sm text-slate-700">É um prazer ter você conosco.</p>
                {/* Explica o convite da empresa sem inserir conteúdo HTML dinâmico. */}
                <p className="text-sm text-slate-700">A <strong>{nomeEmpresa}</strong> convida você a fazer parte do ObraMaster e acompanhar de perto cada etapa da sua obra.</p>
                {/* Destaca a obra relacionada ao convite. */}
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Sua obra">
                  {/* Identifica a área de destaque da obra. */}
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">SUA OBRA</p>
                  {/* Exibe o nome da obra ou a alternativa neutra. */}
                  <h2 className="mt-1 text-lg font-bold text-navy">{nomeObra}</h2>
                  {/* Explica o que ficará disponível após o acesso. */}
                  <p className="mt-1 text-sm text-slate-600">Acompanhe as informações e novidades da sua obra em um só lugar.</p>
                </section>
                {/* Orienta a confirmar o e-mail e criar uma senha de acesso. */}
                <p className="text-sm text-slate-700">Para começar, confirme seu e-mail e crie sua senha de acesso. Assim, sua área estará pronta para você!</p>
              </div>
            ) : (
              // Preserva a apresentação que já existia para gerente e cliente logado.
              <>
                {/* Mantém o link de marca da tela atual. */}
                <Link to="/login" className="text-sm text-sky-700">ObraMaster</Link>
                {/* Mantém o título atual para os demais fluxos de convite. */}
                <h1 className="mt-4 text-2xl font-bold text-[#0c2d43]">Convite para acessar uma obra</h1>
                {/* Preserva empresa, nome, obra e e-mail na tela de gerente. */}
                <p className="mt-4 text-sm text-slate-700">A empreiteira <strong>{convite.empresa}</strong> convidou <strong>{convite.nome}</strong>{convite.tipo === 'CLIENTE' ? convite.obra ? <> para acompanhar a obra <strong>{convite.obra}</strong>.</> : <> para se cadastrar como cliente e acompanhar as obras vinculadas à sua conta.</> : convite.obra ? <> como gerente responsável pela obra <strong>{convite.obra}</strong> ({convite.email}).</> : <> como gerente responsável, sem obra vinculada ({convite.email}).</>}</p>
              </>
            )}
            {/* Preserva as mensagens específicas de convite expirado ou usado. */}
            {(convite.expirado || convite.usado)
              ? <p className="mt-4 text-sm text-red-700">Este convite {convite.usado ? 'já foi utilizado' : 'expirou'}. Peça à empreiteira um novo link.</p>
              : (
                // Mantém o formulário disponível somente para convites ainda válidos.
                <form onSubmit={enviar} noValidate={!possuiSessao} className="mt-5 space-y-3">
                  {/* Preserva o texto atual de conta existente fora do novo fluxo de cliente. */}
                  {!exigeConfirmacaoCliente && !exigeApresentacaoGerente && <p className="text-xs text-slate-600">Se você já tem uma conta, <Link to="/login" className="text-sky-700 underline">entre primeiro</Link> e volte a este link. Caso contrário, confirme seus dados e crie sua senha.</p>}
                  {/* Solicita o e-mail digitado somente para cliente sem sessão. */}
                  {exigeConfirmacaoCliente && <label className="block text-sm font-medium">Confirme seu e-mail<input required type="email" name="confirmarEmail" autoComplete="off" value={email} onChange={(event) => { setEmail(event.target.value); setErroEmail(''); setErro('') }} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>}
                  {/* Orienta a usar a caixa de e-mail para a qual o convite foi enviado. */}
                  {exigeConfirmacaoCliente && <p className="text-xs text-slate-600">Utilize o endereço de e-mail para o qual este convite foi enviado.</p>}
                  {/* Mostra somente a dica mascarada devolvida pelo backend. */}
                  {exigeConfirmacaoCliente && <p className="text-xs text-slate-600">Dica: {convite.emailDica || 'indisponível'}</p>}
                  {/* Exibe erros do e-mail imediatamente junto ao campo correspondente. */}
                  {exigeConfirmacaoCliente && erroEmail && <p role="alert" className="text-sm font-semibold text-red-800">{erroEmail}</p>}
                  {/* Pede uma senha nova somente quando ainda não existe sessão. */}
                  {!possuiSessao && <label className="block text-sm font-medium">{exigeApresentacaoGerente ? 'Senha de acesso' : 'Crie sua senha'}<input required type="password" name="senha" autoComplete="new-password" value={senha} onChange={(event) => { setSenha(event.target.value); setErro('') }} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>}
                  {/* Mostra o andamento das quatro regras enquanto a senha é digitada. */}
                  {!possuiSessao && <ul className="space-y-1 text-xs text-slate-600" aria-label="Regras da senha">{avaliacaoSenha.requisitos.map((requisito) => <li key={requisito.id}><span aria-hidden="true">{requisito.valido ? '✓' : '○'}</span> {requisito.rotulo}</li>)}</ul>}
                  {/* Confirma a senha somente para o novo cadastro de cliente. */}
                  {exigeConfirmacaoCliente && <label className="block text-sm font-medium">Confirme sua senha<input required type="password" name="confirmarSenha" autoComplete="new-password" value={confirmarSenha} onChange={(event) => { setConfirmarSenha(event.target.value); setErro('') }} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>}
                  {/* Exibe mensagens locais e demais respostas da API em português. */}
                  {erro && <p role="alert" className="rounded bg-red-50 p-3 text-sm font-semibold text-red-800">{erro}</p>}
                  {/* Envia o convite com o botão contextual somente para cliente sem sessão. */}
                  <button disabled={carregando} className="w-full rounded-lg bg-[#0c2d43] p-3 font-semibold text-white">{exigeConfirmacaoCliente ? 'Aceitar convite e acessar' : 'Aceitar convite'}</button>
                  {/* Exibe o rodapé aprovado somente para cliente sem sessão. */}
                  {exigeConfirmacaoCliente && <p className="text-xs text-slate-600">Já possui uma conta? <Link to="/login" className="text-sky-700 underline">Entre</Link> com seu acesso existente para aceitar o convite.</p>}
                  {/* Mantém o convite de gerente sem sessão acessível à conta existente. */}
                  {exigeApresentacaoGerente && <p className="text-xs text-slate-600">Já possui uma conta? <Link to="/login" className="text-sky-700 underline">Entre</Link> primeiro e retorne a este convite.</p>}
                </form>
              )}
          </>
        )}
      </section>
    </main>
  )
}
