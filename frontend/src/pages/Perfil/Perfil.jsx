// Importa os hooks useEffect e useState do React para ciclo de vida e estados da tela.
import { useEffect, useState } from 'react'
// Importa Link e useNavigate do React Router para navegação entre telas.
import { Link, useLocation, useNavigate } from 'react-router-dom'
// Importa o componente de botão reutilizável do sistema.
import Button from '../../components/Button.jsx'
// Importa o componente de input reutilizável usado na seção de segurança.
import Input from '../../components/Input.jsx'
// Importa o componente de foto/iniciais do usuário.
import Avatar from '../../components/Avatar.jsx'
// Importa o campo reutilizável com dica de CPF exibida ao focar.
import CampoDocumento from '../../components/CampoDocumento.jsx'
// Importa os serviços de autenticação e atualização de perfil/senha da API.
import { atualizarPerfil, buscarUsuarioAtual, alterarSenha, encerrarSessao, salvarSessao } from '../../services/auth.js'
// Importa a função que devolve a rota inicial de cada perfil.
import { obterRotaDashboard } from '../../routes/dashboardRoutes.js'
// Importa a função que resolve a foto de perfil do usuário.
import { obterFotoPerfil } from '../../utils/fotoPerfil.js'
// Importa a validação e máscara de CPF já existentes.
import { cpfValido, formatarCpf } from '../../utils/cpf.js'
// Importa a máscara de telefone brasileiro já existente.
import { formatarTelefoneBR } from '../../utils/telefone.js'
// Importa os helpers puros de estado, leitura, payloads e mesclagem do perfil.
import {
  criarEstadosFormularioPerfil,
  dadosEmpresa,
  dadosPessoais,
  formatarValorLeitura,
  mesclarUsuarioAtualizado,
  montarPayloadContato,
  montarPayloadEnderecoEmpresa,
  montarPayloadEnderecoPessoal,
  obterUsuarioLocal,
  traduzirTipoPerfil,
  usuarioPossuiEnderecoEmpresa,
} from '../../utils/perfilDados.js'

// Componente auxiliar para exibir um campo no modo leitura com "Não informado" quando vazio.
function CampoLeitura({ rotulo, valor, textoFormatado }) {
  // Usa o texto já tratado (ex.: regras de apartamento/bloco) ou aplica o formatador padrão.
  const conteudo = textoFormatado ?? formatarValorLeitura(valor)
  // Renderiza o par rótulo + valor em formato limpo e legível.
  return (
    <div className="min-w-0">
      {/* Nome do campo */}
      <dt className="text-[11px] font-semibold text-slate-500">{rotulo}</dt>
      {/* Valor salvo ou "Não informado" */}
      <dd className="mt-0.5 break-words text-sm font-medium text-navy">{conteudo}</dd>
    </div>
  )
}

// Componente auxiliar com o cabeçalho padrão de cada seção e botão "Alterar" no modo leitura.
function CabecalhoSecao({ subtitulo, titulo, icone, editando, aoAlterar }) {
  // Renderiza o título da seção à esquerda e o botão "Alterar" (quando em leitura) ou ícone à direita.
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-[15px]">
      <div>
        {/* Etiqueta superior discreta */}
        <p className="mb-1 text-[9px] font-bold tracking-[.12em] text-slate-500">{subtitulo}</p>
        {/* Título da seção */}
        <h2 className="m-0 text-[15px] font-bold text-navy">{titulo}</h2>
      </div>
      <div className="flex items-center gap-2">
        {/* Botão "Alterar" disponível quando a seção está em modo leitura */}
        {!editando && (
          <Button type="button" variant="outline" onClick={aoAlterar} className="px-3 py-1.5 text-xs">
            Alterar
          </Button>
        )}
        {/* Ícone decorativo preservado do layout existente */}
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-sky-50 text-[17px] text-sky-700" aria-hidden="true">
          {icone}
        </span>
      </div>
    </div>
  )
}

// Componente auxiliar que renderiza os botões "Salvar" e "Cancelar" de uma seção em edição.
function AcoesEdicaoSecao({ salvando, aoCancelar }) {
  // Renderiza o par de botões padrão de toda seção editável.
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {/* Envia as alterações da seção atual */}
      <Button type="submit" variant="compact" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar'}
      </Button>
      {/* Descarta alterações da seção atual e volta ao modo leitura */}
      <Button type="button" variant="outline" disabled={salvando} onClick={aoCancelar} className="px-3.5 py-2 text-xs">
        Cancelar
      </Button>
    </div>
  )
}

// Componente principal da tela de Perfil (/perfil) compartilhada por todos os perfis.
export default function Perfil() {
  // Hook do React Router para navegar de volta ao painel do perfil logado.
  const navigate = useNavigate()
  // Lê a mensagem temporária enviada após o aceite de um convite.
  const location = useLocation()
  // Guarda a mensagem localmente para que apareça apenas nesta visita ao Perfil.
  const [mensagemBoasVindas] = useState(() => location.state?.mensagemBoasVindas || '')

  // Remove a mensagem do histórico após copiá-la para o estado desta tela.
  useEffect(() => {
    // Só altera a navegação quando a mensagem de convite está presente.
    if (location.state?.mensagemBoasVindas) {
      // Substitui o estado da rota para impedir que a mensagem reapareça ao atualizar a página.
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.key, location.pathname, location.state, navigate])

  // Lê o usuário salvo localmente na inicialização para já montar os campos sem esperar a API.
  const [usuario, setUsuario] = useState(() => obterUsuarioLocal())
  // Deriva os rascunhos iniciais de formulário a partir do usuário salvo localmente.
  const estadosIniciais = criarEstadosFormularioPerfil(usuario)

  // Identifica o perfil do usuário atual para montar o menu lateral e a rota de retorno.
  const tipoPerfil = usuario?.tipo || obterUsuarioLocal()?.tipo
  // Resolve a foto atual exibida na sidebar, cabeçalho e seção Identidade.
  const fotoPerfil = obterFotoPerfil(usuario)
  // Descobre a rota inicial do painel conforme o perfil logado.
  const rotaDashboard = obterRotaDashboard(tipoPerfil) || '/login'

  // Controla se a busca inicial em /auth/me ainda está em andamento.
  const [carregandoPerfil, setCarregandoPerfil] = useState(true)
  // Guarda eventual erro fatal caso não haja nem API nem sessão local.
  const [erroPerfil, setErroPerfil] = useState('')

  // Estados dos 3 campos de troca de senha da seção Segurança.
  const [campos, setCampos] = useState({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })

  // Mensagens de feedback individuais por seção para aparecerem junto à ação correspondente.
  const [mensagemIdentidade, setMensagemIdentidade] = useState(null)
  const [mensagemContato, setMensagemContato] = useState(null)
  const [mensagemEndereco, setMensagemEndereco] = useState(null)
  const [mensagemEmpresa, setMensagemEmpresa] = useState(null)
  // Guarda o feedback independente da edição do slogan da empresa.
  const [mensagemSloganEmpresa, setMensagemSloganEmpresa] = useState(null)
  const [mensagemSenha, setMensagemSenha] = useState(null)

  // Indica se alguma requisição de salvamento está em andamento.
  const [salvando, setSalvando] = useState(false)
  // Armazena os campos editáveis de contato e endereço pessoal.
  const [dadosContato, setDadosContato] = useState(() => estadosIniciais.dadosContato)
  // Armazena os campos editáveis de endereço da empresa (quando ADMIN).
  const [dadosEmpresaForm, setDadosEmpresaForm] = useState(() => estadosIniciais.dadosEmpresaForm)
  // Controla a opção temporária de que a empresa não tem complemento.
  const [semComplementoEmpresa, setSemComplementoEmpresa] = useState(false)
  // Controla se o campo de telefone adicional está visível na edição de contato.
  const [mostrarTelefoneAdicional, setMostrarTelefoneAdicional] = useState(() => estadosIniciais.mostrarTelefoneAdicional)
  // Armazena o arquivo de foto selecionado na edição da seção Identidade.
  const [fotoSelecionada, setFotoSelecionada] = useState(null)
  // Armazena erro de validação local do arquivo de foto.
  const [erroFoto, setErroFoto] = useState('')

  // Controla o modo leitura/edição independente de cada uma das 5 seções.
  const [modoEdicao, setModoEdicao] = useState({
    identidade: false,
    contato: false,
    enderecoPessoal: false,
    sloganEmpresa: false,
    enderecoEmpresa: false,
    seguranca: false,
  })

  // Preenche o usuário e todos os estados derivados do formulário de maneira uniforme.
  function aplicarUsuarioNosEstados(dados) {
    // Calcula todos os estados do formulário com os dados recebidos (API ou fallback local).
    const proximos = criarEstadosFormularioPerfil(dados)
    // Atualiza o objeto principal do usuário.
    setUsuario(dados)
    // Preenche os campos pessoais e de contato.
    setDadosContato(proximos.dadosContato)
    // Preenche os campos de endereço da empresa.
    setDadosEmpresaForm(proximos.dadosEmpresaForm)
    // Exibe o telefone adicional quando já houver um número cadastrado.
    setMostrarTelefoneAdicional(proximos.mostrarTelefoneAdicional)
  }

  // Busca os dados atualizados do usuário ao abrir a tela; se falhar, aplica o fallback local completo.
  useEffect(() => {
    // Flag para impedir atualização de estado após desmontagem do componente.
    let ativo = true

    // Consulta o endpoint autenticado /auth/me.
    buscarUsuarioAtual()
      .then((dados) => {
        // Só atualiza se o componente continuar montado na tela.
        if (ativo) {
          // Hidrata usuário e todos os formulários com o retorno da API.
          aplicarUsuarioNosEstados(dados)
        }
      })
      .catch((erro) => {
        // Só trata o erro se o componente continuar montado.
        if (ativo) {
          // Tenta usar os dados já salvos na sessão local (modo mock/offline).
          const dadosLocais = obterUsuarioLocal()
          // Se houver usuário local, preenche tanto o usuário quanto TODOS os estados do formulário.
          if (dadosLocais) {
            aplicarUsuarioNosEstados(dadosLocais)
          } else {
            // Sem fallback local, registra o erro para exibir o alerta na tela.
            setErroPerfil(erro.message)
            // Se o token foi rejeitado (401), limpa a sessão inválida do navegador.
            if (erro.status === 401) encerrarSessao()
          }
        }
      })
      .finally(() => {
        // Encerra o estado de carregamento inicial.
        if (ativo) setCarregandoPerfil(false)
      })

    // Cleanup executado ao sair da página de perfil.
    return () => { ativo = false }
  }, [])

  // Alterna uma seção específica para o modo edição e limpa mensagens antigas dela.
  function abrirEdicao(secao, limparMensagem) {
    // Remove mensagem anterior da seção ao começar nova edição.
    if (limparMensagem) limparMensagem(null)
    // Mantém as demais seções como estão e abre a seção solicitada.
    setModoEdicao((atual) => ({ ...atual, [secao]: true }))
  }

  // Atualiza os campos do formulário de senha conforme o usuário digita.
  function atualizarCampo(event) {
    // Atualiza apenas o campo modificado (senhaAtual, novaSenha ou confirmarSenha).
    setCampos((atuais) => ({ ...atuais, [event.target.name]: event.target.value }))
    // Limpa mensagem anterior assim que o usuário volta a digitar.
    setMensagemSenha(null)
  }

  // Persiste o retorno de PATCH /usuarios/me na sessão local e atualiza o usuário em memória.
  function concluirAtualizacaoUsuario(resposta) {
    // Mescla para preservar campos da empresa (como nome) quando a API retorna só o que mudou.
    const usuarioMesclado = mesclarUsuarioAtualizado(usuario, resposta.usuario)
    // Verifica se o login original usou localStorage ("Lembrar de mim").
    const lembrar = Boolean(localStorage.getItem('token'))
    // Usa o novo token emitido pelo backend (necessário se o e-mail mudar) ou o token atual.
    const tokenAtual = resposta.token || localStorage.getItem('token') || sessionStorage.getItem('token')
    // Atualiza o armazenamento local com o token válido e o usuário mesclado.
    salvarSessao({ token: tokenAtual, usuario: usuarioMesclado }, lembrar)
    // Atualiza o estado principal do usuário na tela.
    setUsuario(usuarioMesclado)
    // Devolve o usuário já mesclado para atualizar a seção salva.
    return usuarioMesclado
  }

  // Salva apenas a nova foto na seção Identidade.
  async function salvarIdentidade(event) {
    // Evita recarregamento da página ao enviar o formulário.
    event.preventDefault()
    // Limpa feedbacks antigos da seção.
    setMensagemIdentidade(null)
    setErroFoto('')
    // Exige seleção de um arquivo antes de chamar a API.
    if (!fotoSelecionada) {
      setMensagemIdentidade({ tipo: 'erro', texto: 'Selecione uma nova foto antes de salvar.' })
      return
    }
    // Ativa o indicador de carregamento dos botões.
    setSalvando(true)
    try {
      // Valida tipo e tamanho máximo (5 MB) do arquivo escolhido.
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(fotoSelecionada.type) || fotoSelecionada.size > 5 * 1024 * 1024) {
        throw new Error('Escolha uma foto JPG, PNG ou WebP de até 5 MB.')
      }
      // Converte a imagem para data URL base64 esperada pelo backend.
      const foto = await new Promise((resolve, reject) => {
        const leitor = new FileReader()
        leitor.onload = () => resolve({ data: leitor.result, mimeType: fotoSelecionada.type })
        leitor.onerror = () => reject(new Error('Não foi possível ler a foto.'))
        leitor.readAsDataURL(fotoSelecionada)
      })
      // Envia somente a foto para PATCH /usuarios/me.
      const resposta = await atualizarPerfil({ foto })
      // Atualiza a sessão local preservando dados existentes da empresa.
      concluirAtualizacaoUsuario(resposta)
      // Limpa o rascunho de arquivo e volta ao modo leitura.
      setFotoSelecionada(null)
      setModoEdicao((atual) => ({ ...atual, identidade: false }))
      setMensagemIdentidade({ tipo: 'sucesso', texto: resposta.mensagem || 'Foto de perfil atualizada.' })
    } catch (erro) {
      // Exibe erro de upload no bloco apropriado da seção Identidade.
      const texto = erro.message || 'Não foi possível atualizar a foto.'
      if (/foto|imagem|cloudinary|upload/i.test(texto)) setErroFoto(texto)
      else setMensagemIdentidade({ tipo: 'erro', texto })
    } finally {
      // Libera os botões ao concluir.
      setSalvando(false)
    }
  }

  // Cancela a edição da seção Identidade descartando a foto selecionada.
  function cancelarIdentidade() {
    // Limpa foto em rascunho e mensagens da seção.
    setFotoSelecionada(null)
    setErroFoto('')
    setMensagemIdentidade(null)
    // Retorna a seção ao modo leitura.
    setModoEdicao((atual) => ({ ...atual, identidade: false }))
  }

  // Salva apenas os campos da seção Contato (e-mail, telefones e CPF).
  async function salvarSecaoContato(event) {
    // Impede recarregamento da página.
    event.preventDefault()
    // Limpa feedback anterior da seção.
    setMensagemContato(null)
    // Valida dígitos do CPF antes de enviar, quando preenchido.
    if (dadosContato.cpf && !cpfValido(dadosContato.cpf)) {
      setMensagemContato({ tipo: 'erro', texto: 'Informe um CPF válido.' })
      return
    }
    // Bloqueia cliques duplicados enquanto salva.
    setSalvando(true)
    try {
      // Envia apenas os campos de contato para o backend.
      const resposta = await atualizarPerfil(montarPayloadContato(dadosContato))
      // Atualiza sessão local e estado principal do usuário.
      const usuarioMesclado = concluirAtualizacaoUsuario(resposta)
      // Sincroniza apenas os campos de contato no rascunho sem apagar edições abertas de endereço.
      const pessoaisAtualizados = dadosPessoais(usuarioMesclado)
      setDadosContato((atual) => ({
        ...atual,
        email: pessoaisAtualizados.email,
        telefone: pessoaisAtualizados.telefone,
        telefoneSecundario: pessoaisAtualizados.telefoneSecundario,
        cpf: pessoaisAtualizados.cpf,
      }))
      // Ajusta exibição do telefone adicional conforme o valor salvo.
      setMostrarTelefoneAdicional(Boolean(usuarioMesclado.telefoneSecundario))
      // Retorna a seção Contato ao modo leitura com mensagem de sucesso.
      setModoEdicao((atual) => ({ ...atual, contato: false }))
      setMensagemContato({ tipo: 'sucesso', texto: resposta.mensagem || 'Contato atualizado.' })
    } catch (erro) {
      // Mostra a mensagem de erro retornada pelo backend junto da seção.
      setMensagemContato({ tipo: 'erro', texto: erro.message || 'Não foi possível atualizar o contato.' })
    } finally {
      // Restaura estado do botão.
      setSalvando(false)
    }
  }

  // Cancela a edição de Contato restaurando os valores salvos no usuário.
  function cancelarSecaoContato() {
    // Recalcula os valores originais salvos para e-mail, telefones e CPF.
    const originais = dadosPessoais(usuario || {})
    // Restaura apenas os campos da seção Contato.
    setDadosContato((atual) => ({
      ...atual,
      email: originais.email,
      telefone: originais.telefone,
      telefoneSecundario: originais.telefoneSecundario,
      cpf: originais.cpf,
    }))
    // Restaura visibilidade do segundo telefone conforme o usuário salvo.
    setMostrarTelefoneAdicional(Boolean(usuario?.telefoneSecundario))
    // Limpa mensagens antigas e fecha a edição da seção.
    setMensagemContato(null)
    setModoEdicao((atual) => ({ ...atual, contato: false }))
  }

  // Salva apenas os campos da seção Endereço pessoal.
  async function salvarSecaoEnderecoPessoal(event) {
    // Impede recarregamento da página.
    event.preventDefault()
    // Limpa mensagem anterior da seção.
    setMensagemEndereco(null)
    // Ativa estado de carregamento.
    setSalvando(true)
    try {
      // Envia exclusivamente os campos do endereço pessoal.
      const resposta = await atualizarPerfil(montarPayloadEnderecoPessoal(dadosContato))
      // Atualiza sessão local e estado principal do usuário.
      const usuarioMesclado = concluirAtualizacaoUsuario(resposta)
      // Sincroniza apenas os campos de endereço pessoal salvos.
      const pessoaisAtualizados = dadosPessoais(usuarioMesclado)
      setDadosContato((atual) => ({
        ...atual,
        endereco: pessoaisAtualizados.endereco,
        estado: pessoaisAtualizados.estado,
        cidade: pessoaisAtualizados.cidade,
        bairro: pessoaisAtualizados.bairro,
        numero: pessoaisAtualizados.numero,
        complemento: pessoaisAtualizados.complemento,
        apartamento: pessoaisAtualizados.apartamento,
        bloco: pessoaisAtualizados.bloco,
        semApartamento: pessoaisAtualizados.semApartamento,
        semBloco: pessoaisAtualizados.semBloco,
      }))
      // Sai do modo edição e exibe confirmação junto da seção.
      setModoEdicao((atual) => ({ ...atual, enderecoPessoal: false }))
      setMensagemEndereco({ tipo: 'sucesso', texto: resposta.mensagem || 'Endereço pessoal atualizado.' })
    } catch (erro) {
      // Exibe erro junto da seção Endereço pessoal.
      setMensagemEndereco({ tipo: 'erro', texto: erro.message || 'Não foi possível atualizar o endereço pessoal.' })
    } finally {
      // Libera os botões.
      setSalvando(false)
    }
  }

  // Cancela a edição do Endereço pessoal restaurando os dados salvos.
  function cancelarSecaoEnderecoPessoal() {
    // Lê os dados pessoais originais do usuário salvo.
    const originais = dadosPessoais(usuario || {})
    // Restaura apenas os campos de endereço pessoal no rascunho.
    setDadosContato((atual) => ({
      ...atual,
      endereco: originais.endereco,
      estado: originais.estado,
      cidade: originais.cidade,
      bairro: originais.bairro,
      numero: originais.numero,
      complemento: originais.complemento,
      apartamento: originais.apartamento,
      bloco: originais.bloco,
      semApartamento: originais.semApartamento,
      semBloco: originais.semBloco,
    }))
    // Limpa feedback e retorna ao modo leitura.
    setMensagemEndereco(null)
    setModoEdicao((atual) => ({ ...atual, enderecoPessoal: false }))
  }

  // Salva apenas os campos da seção Endereço da empresa (perfil ADMIN).
  async function salvarSecaoEnderecoEmpresa(event) {
    // Impede envio padrão do formulário.
    event.preventDefault()
    // Limpa feedback antigo da seção.
    setMensagemEmpresa(null)
    // Ativa estado de salvamento.
    setSalvando(true)
    try {
      // Envia o objeto empresa com os campos editáveis de endereço.
      const payloadEmpresa = montarPayloadEnderecoEmpresa(dadosEmpresaForm, semComplementoEmpresa)
      const resposta = await atualizarPerfil({ empresa: payloadEmpresa })
      // Mescla com a empresa atual para preservar nome/CNPJ e salva a sessão.
      const usuarioMesclado = concluirAtualizacaoUsuario(resposta)
      // Atualiza o formulário com os dados da empresa já mesclados.
      setDadosEmpresaForm((atuais) => ({ ...atuais, ...montarPayloadEnderecoEmpresa(usuarioMesclado.empresa) }))
      setSemComplementoEmpresa(false)
      // Retorna ao modo leitura e exibe mensagem de confirmação.
      setModoEdicao((atual) => ({ ...atual, enderecoEmpresa: false }))
      setMensagemEmpresa({ tipo: 'sucesso', texto: resposta.mensagem || 'Endereço da empresa atualizado.' })
    } catch (erro) {
      // Exibe falha junto da seção Endereço da empresa.
      setMensagemEmpresa({ tipo: 'erro', texto: erro.message || 'Não foi possível atualizar o endereço da empresa.' })
    } finally {
      // Libera os botões.
      setSalvando(false)
    }
  }

  // Cancela a edição do Endereço da empresa restaurando os dados salvos.
  function cancelarSecaoEnderecoEmpresa() {
    // Restaura os campos da empresa a partir do último estado salvo do usuário.
    const enderecoSalvo = montarPayloadEnderecoEmpresa(dadosEmpresa(usuario?.empresa || {}))
    setDadosEmpresaForm((atuais) => ({ ...atuais, ...enderecoSalvo }))
    setSemComplementoEmpresa(false)
    // Limpa mensagem anterior e fecha a edição.
    setMensagemEmpresa(null)
    setModoEdicao((atual) => ({ ...atual, enderecoEmpresa: false }))
  }

  // Salva o slogan opcional da empresa usando o endpoint já disponível para ADMIN.
  async function salvarSloganEmpresa(event) {
    // Impede o envio padrão do formulário.
    event.preventDefault()
    // Limpa avisos anteriores e inicia o estado de salvamento.
    setMensagemSloganEmpresa(null)
    setSalvando(true)
    try {
      // Envia somente o slogan para não alterar o restante dos dados da empresa.
      const resposta = await atualizarPerfil({ empresa: { slogan: dadosEmpresaForm.slogan } })
      // Atualiza o usuário local preservando os demais campos da empresa.
      const usuarioMesclado = concluirAtualizacaoUsuario(resposta)
      // Atualiza somente o slogan no formulário e mantém outros rascunhos.
      setDadosEmpresaForm((atuais) => ({ ...atuais, slogan: usuarioMesclado.empresa?.slogan || '' }))
      // Fecha a edição e confirma a gravação do slogan.
      setModoEdicao((atual) => ({ ...atual, sloganEmpresa: false }))
      setMensagemSloganEmpresa({ tipo: 'sucesso', texto: resposta.mensagem || 'Slogan da empresa atualizado.' })
    } catch (erro) {
      // Exibe falha junto dos dados de identificação da empresa.
      setMensagemSloganEmpresa({ tipo: 'erro', texto: erro.message || 'Não foi possível atualizar o slogan da empresa.' })
    } finally {
      // Libera os botões mesmo quando a requisição falha.
      setSalvando(false)
    }
  }

  // Cancela a edição do slogan e restaura o último valor salvo.
  function cancelarSloganEmpresa() {
    // Preserva os outros campos enquanto restaura o slogan salvo.
    setDadosEmpresaForm((atuais) => ({ ...atuais, slogan: usuario?.empresa?.slogan || '' }))
    // Limpa o feedback e volta ao modo de leitura.
    setMensagemSloganEmpresa(null)
    setModoEdicao((atual) => ({ ...atual, sloganEmpresa: false }))
  }

  // Valida e envia a alteração de senha da seção Segurança.
  async function enviarTrocaSenha(event) {
    // Impede recarregamento da página.
    event.preventDefault()
    // Limpa feedback anterior de senha.
    setMensagemSenha(null)

    // Garante que os três campos de senha foram preenchidos.
    if (!campos.senhaAtual || !campos.novaSenha || !campos.confirmarSenha) {
      setMensagemSenha({ tipo: 'erro', texto: 'Preencha todos os campos de senha.' })
      return
    }
    // Garante que a confirmação confere com a nova senha digitada.
    if (campos.novaSenha !== campos.confirmarSenha) {
      setMensagemSenha({ tipo: 'erro', texto: 'A nova senha e a confirmação precisam ser iguais.' })
      return
    }

    // Ativa indicador de carregamento.
    setSalvando(true)
    try {
      // Chama o endpoint PATCH /usuarios/me/senha.
      const resultado = await alterarSenha(campos.senhaAtual, campos.novaSenha)
      // Limpa as senhas digitadas por segurança e volta ao modo leitura.
      setCampos({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })
      setModoEdicao((atual) => ({ ...atual, seguranca: false }))
      setMensagemSenha({ tipo: 'sucesso', texto: resultado.mensagem || 'Senha alterada com sucesso.' })
    } catch (erro) {
      // Mostra erro retornado pelo servidor (ex.: senha atual incorreta).
      setMensagemSenha({ tipo: 'erro', texto: erro.message || 'Não foi possível alterar a senha.' })
    } finally {
      // Libera os botões.
      setSalvando(false)
    }
  }

  // Cancela a edição da seção Segurança limpando os campos digitados.
  function cancelarTrocaSenha() {
    // Zera os três campos de senha e limpa eventual mensagem de erro.
    setCampos({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })
    setMensagemSenha(null)
    // Volta ao modo leitura da seção.
    setModoEdicao((atual) => ({ ...atual, seguranca: false }))
  }

  // Valida localmente o arquivo de imagem selecionado para o perfil.
  function selecionarFoto(event) {
    // Obtém o primeiro arquivo selecionado no input file.
    const arquivo = event.target.files?.[0] || null
    // Limpa erros anteriores de arquivo.
    setErroFoto('')
    // Valida extensão e tamanho máximo de 5 MB antes de aceitar no estado.
    if (arquivo && (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type) || arquivo.size > 5 * 1024 * 1024)) {
      setFotoSelecionada(null)
      event.target.value = ''
      setErroFoto('Escolha uma foto JPG, PNG ou WebP de até 5 MB.')
      return
    }
    // Guarda o arquivo válido para envio ao clicar em Salvar.
    setFotoSelecionada(arquivo)
  }

  // Define os itens do menu lateral compacto do Perfil, já sem o item textual "Perfil".
  const itensMenu = tipoPerfil === 'ADMIN'
    ? [
        { to: '/admin', label: 'Início', icon: '⌂' },
        { to: '/admin/notificacoes', label: 'Notificações', icon: '♧' },
        { to: '/admin/pagamentos', label: 'Pagamentos', icon: '◉' },
      ]
    : tipoPerfil === 'CLIENTE'
      ? [
          { to: '/cliente', label: 'Minhas Obras', icon: '▣' },
          { to: '/cliente/pagamentos', label: 'Pagamentos', icon: '◉' },
          { to: '/cliente/precos', label: 'Preços', icon: '$' },
          { to: '/cliente/notificacoes', label: 'Notificações', icon: '♧' },
          { to: '/cliente/contratos', label: 'Contrato', icon: '▤' },
        ]
      : [
          { to: '/colaborador', label: 'Início', icon: '▣' },
          { to: '/colaborador', label: 'Gestão de Obras', icon: '▤' },
          { to: '/colaborador/notificacoes', label: 'Notificações', icon: '♧' },
        ]

  // Verifica se o usuário atual possui endereço da empresa para ajustar a grade de 12 colunas.
  const temEnderecoEmpresa = usuarioPossuiEnderecoEmpresa(usuario)

  // Renderiza a estrutura com barra lateral compacta + grade principal de 12 colunas (1 coluna no celular).
  return (
    <div className="flex min-h-screen bg-background text-slate-800 max-[620px]:flex-col">
      {/* ---------- SIDEBAR COMPACTA ---------- */}
      <aside className="sticky top-0 flex h-screen w-[216px] shrink-0 flex-col overflow-y-auto bg-navy px-3 py-[22px] pb-4 text-slate-200 max-[920px]:w-[190px] max-[620px]:static max-[620px]:h-auto max-[620px]:w-full max-[620px]:shrink-0 max-[620px]:px-[14px] max-[620px]:py-[13px]">
        {/* Logo do ObraMaster apontando para o início do perfil logado */}
        <Link
          className="inline-flex min-w-0 items-center gap-[10px] px-[5px] text-white no-underline max-[620px]:px-[2px]"
          to={rotaDashboard}
          aria-label="ObraMaster"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-xl font-bold" aria-hidden="true">⌂</span>
          <span className="min-w-0">
            <strong className="block text-[17px] leading-[1.1] tracking-[-.04em]">
              Obra<span className="text-sky-300">Master</span>
            </strong>
            {/* Exibe o nome da empresa e o slogan do administrador abaixo da marca. */}
            {tipoPerfil === 'ADMIN' && usuario?.empresa?.nome && (
              <small className="mt-1 block break-words text-[8px] tracking-[.12em] text-slate-400">
                {usuario.empresa.nome}
              </small>
            )}
            {/* Oculta a linha do slogan quando a empresa ainda não cadastrou um. */}
            {tipoPerfil === 'ADMIN' && usuario?.empresa?.slogan && (
              <small className="mt-1 block break-words text-[8px] tracking-[.12em] text-slate-400">
                {usuario.empresa.slogan}
              </small>
            )}
            <small className="mt-1 block text-[8px] tracking-[.12em] text-slate-400">GESTÃO DE OBRAS</small>
          </span>
        </Link>

        {/* Foto maior clicável no menu compacto com a palavra "Perfil" embaixo */}
        <div className="mt-7 flex justify-center max-[620px]:mt-4">
          <Link
            to="/perfil"
            aria-label="Abrir perfil"
            className="flex flex-col items-center gap-1.5 rounded-lg px-3 py-2 text-slate-200 no-underline transition hover:bg-white/10"
          >
            <Avatar nome={usuario?.nome} src={fotoPerfil} className="h-20 w-20 border-white/30" fallbackClassName="bg-white/10 text-white" />
            <span className="text-xs font-semibold">Perfil</span>
          </Link>
        </div>

        {/* Links de navegação da conta sem o item textual "Perfil" */}
        <nav className="mt-[28px] grid gap-[5px] max-[620px]:mt-[14px] max-[620px]:grid-cols-3 max-[620px]:gap-1 max-[360px]:grid-cols-2" aria-label="Navegação da conta">
          {itensMenu.map((item) => (
            <Link
              key={`${item.to}-${item.label}`}
              to={item.to}
              className="flex min-h-[39px] items-center gap-[11px] whitespace-nowrap rounded-[9px] px-[11px] text-xs font-medium text-slate-300 hover:bg-white/10 max-[620px]:min-w-0 max-[620px]:min-h-[35px] max-[620px]:gap-1.5 max-[620px]:px-[7px] max-[620px]:text-[10px]"
            >
              <span className="grid w-[17px] shrink-0 place-items-center text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Rodapé discreto da barra lateral */}
        <div className="mt-auto px-[7px] pt-3 text-[9px] text-slate-400 max-[620px]:hidden">ObraMaster · Gestão de Obras</div>
      </aside>

      {/* ---------- CONTEÚDO PRINCIPAL ---------- */}
      <div className="min-w-0 flex-1">
        {/* Barra superior com título da página e botão ← Voltar ao dashboard do perfil */}
        <header className="flex min-h-[62px] items-center justify-between border-b border-slate-200 bg-white px-[clamp(22px,4vw,52px)] max-[620px]:min-h-[54px] max-[620px]:px-[18px]">
          <div className="grid gap-[3px]">
            <span className="text-[9px] font-bold tracking-[.08em] text-slate-500">MINHA CONTA</span>
            <strong className="text-[13px] font-semibold text-navy">Perfil</strong>
          </div>
          <Button variant="outline" onClick={() => navigate(rotaDashboard)} className="px-3 py-1.5 text-xs">
            ← Voltar
          </Button>
        </header>

        {/* Área central responsiva contendo cabeçalho e a grade de 12 colunas no desktop */}
        <main className="mx-auto w-[min(1120px,calc(100%-64px))] py-7 max-[920px]:w-[min(720px,calc(100%-44px))] max-[620px]:w-[calc(100%-32px)] max-[620px]:py-[23px] max-[360px]:w-[calc(100%-24px)]">
          {/* Mostra a boas-vindas somente quando a navegação veio do aceite do convite. */}
          {mensagemBoasVindas && <p role="status" className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{mensagemBoasVindas}</p>}
          {/* Título da página com Avatar e apresentação */}
          <div className="mb-[19px] flex items-center gap-4 max-[620px]:mb-4">
            <Avatar nome={usuario?.nome} src={fotoPerfil} className="h-16 w-16 border-slate-200 max-[360px]:h-14 max-[360px]:w-14" />
            <div>
              <p className="mb-1.5 text-[9px] font-bold tracking-[.12em] text-slate-500">CONTA</p>
              <h1 className="m-0 text-[clamp(26px,3vw,30px)] font-bold leading-[1.2] tracking-[-.045em] text-navy">Meu perfil</h1>
              <p className="mt-[5px] text-xs text-slate-500">Consulte seus dados e mantenha sua conta segura.</p>
            </div>
          </div>

          {/* Exibe carregando, erro fatal ou as seções preenchidas em modo leitura */}
          {carregandoPerfil ? (
            <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-[22px] text-slate-500 shadow-sm" role="status">
              Carregando seus dados…
            </section>
          ) : erroPerfil ? (
            <section className="min-w-0 rounded-xl border border-red-200 bg-white p-[22px] text-slate-500 shadow-sm" role="alert">
              <h2 className="m-0 text-[15px] text-navy">Não foi possível carregar seu perfil</h2>
              <p className="mt-[9px] text-xs leading-normal">{erroPerfil}</p>
            </section>
          ) : (
            /* Grade principal: 1 coluna no celular e 12 colunas no desktop (lg) */
            <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-12">
              {/* ---- SEÇÃO 1: Identidade (4 colunas no desktop) ---- */}
              <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-[21px_20px_20px] shadow-sm max-[620px]:p-[18px_16px] lg:col-span-4">
                <CabecalhoSecao
                  subtitulo="CONTA"
                  titulo="Identidade"
                  icone="◎"
                  editando={modoEdicao.identidade}
                  aoAlterar={() => abrirEdicao('identidade', setMensagemIdentidade)}
                />

                {modoEdicao.identidade ? (
                  /* Formulário da seção Identidade para troca de foto */
                  <form onSubmit={salvarIdentidade} className="mt-4 space-y-3">
                    <div className="flex justify-center">
                      <Avatar nome={usuario?.nome} src={fotoPerfil} className="h-24 w-24 border-slate-200" />
                    </div>
                    <p className="text-center text-sm font-semibold text-navy">{formatarValorLeitura(usuario?.nome)}</p>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Foto de perfil (JPG, PNG ou WebP)
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={selecionarFoto}
                        aria-describedby={erroFoto ? 'erro-foto-perfil' : undefined}
                        className="mt-1 block w-full rounded border border-slate-300 p-2 text-xs font-normal"
                      />
                      {erroFoto && (
                        <span id="erro-foto-perfil" role="alert" className="mt-2 block rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                          {erroFoto}
                        </span>
                      )}
                    </label>
                    {mensagemIdentidade && (
                      <p className={`rounded-[7px] px-[10px] py-[9px] text-sm font-semibold ${mensagemIdentidade.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`} role={mensagemIdentidade.tipo === 'erro' ? 'alert' : 'status'}>
                        {mensagemIdentidade.texto}
                      </p>
                    )}
                    <AcoesEdicaoSecao salvando={salvando} aoCancelar={cancelarIdentidade} />
                  </form>
                ) : (
                  /* Modo leitura da seção Identidade */
                  <div className="mt-4 space-y-4">
                    <div className="flex justify-center">
                      <Avatar nome={usuario?.nome} src={fotoPerfil} className="h-24 w-24 border-slate-200" />
                    </div>
                    <dl className="space-y-3">
                      <CampoLeitura rotulo="Nome" valor={usuario?.nome} />
                      <CampoLeitura rotulo="Perfil" textoFormatado={traduzirTipoPerfil(usuario?.tipo)} />
                      {usuario?.tipo === 'COLABORADOR' && (
                        <CampoLeitura rotulo="Função" valor={usuario?.funcionario?.funcao} />
                      )}
                    </dl>
                    {mensagemIdentidade && (
                      <p className={`rounded-[7px] px-[10px] py-[9px] text-sm font-semibold ${mensagemIdentidade.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`} role={mensagemIdentidade.tipo === 'erro' ? 'alert' : 'status'}>
                        {mensagemIdentidade.texto}
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* ---- SEÇÃO 2: Contato (8 colunas no desktop) ---- */}
              <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-[21px_20px_20px] shadow-sm max-[620px]:p-[18px_16px] lg:col-span-8">
                <CabecalhoSecao
                  subtitulo="SEU CADASTRO"
                  titulo="Contato"
                  icone="◉"
                  editando={modoEdicao.contato}
                  aoAlterar={() => abrirEdicao('contato', setMensagemContato)}
                />

                {modoEdicao.contato ? (
                  /* Formulário editável da seção Contato */
                  <form onSubmit={salvarSecaoContato} className="mt-4 space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block text-[11px] font-semibold text-slate-700 sm:col-span-2">
                        E-mail
                        <input
                          required
                          type="email"
                          value={dadosContato.email}
                          onChange={(event) => setDadosContato({ ...dadosContato, email: event.target.value })}
                          className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal"
                        />
                      </label>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Telefone
                        <input
                          type="tel"
                          value={dadosContato.telefone}
                          onChange={(event) => setDadosContato({ ...dadosContato, telefone: formatarTelefoneBR(event.target.value) })}
                          className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal"
                        />
                      </label>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        CPF
                        <CampoDocumento
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={14}
                          value={dadosContato.cpf}
                          onChange={(event) => setDadosContato({ ...dadosContato, cpf: formatarCpf(event.target.value) })}
                          placeholder="000.000.000-00"
                          className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal"
                        />
                      </label>
                    </div>
                    {mostrarTelefoneAdicional ? (
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Telefone adicional
                        <input
                          type="tel"
                          value={dadosContato.telefoneSecundario}
                          onChange={(event) => setDadosContato({ ...dadosContato, telefoneSecundario: formatarTelefoneBR(event.target.value) })}
                          className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal"
                        />
                      </label>
                    ) : (
                      <Button type="button" variant="outline" className="text-xs" onClick={() => setMostrarTelefoneAdicional(true)}>
                        Adicionar telefone
                      </Button>
                    )}
                    {mensagemContato && (
                      <p className={`rounded-[7px] px-[10px] py-[9px] text-sm font-semibold ${mensagemContato.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`} role={mensagemContato.tipo === 'erro' ? 'alert' : 'status'}>
                        {mensagemContato.texto}
                      </p>
                    )}
                    <AcoesEdicaoSecao salvando={salvando} aoCancelar={cancelarSecaoContato} />
                  </form>
                ) : (
                  /* Modo leitura da seção Contato exibindo "Não informado" para vazios */
                  <div className="mt-4 space-y-4">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <CampoLeitura rotulo="E-mail" valor={dadosContato.email} />
                      <CampoLeitura rotulo="CPF" valor={dadosContato.cpf} />
                      <CampoLeitura rotulo="Telefone" valor={dadosContato.telefone} />
                      <CampoLeitura rotulo="Telefone adicional" valor={dadosContato.telefoneSecundario} />
                    </dl>
                    {mensagemContato && (
                      <p className={`rounded-[7px] px-[10px] py-[9px] text-sm font-semibold ${mensagemContato.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`} role={mensagemContato.tipo === 'erro' ? 'alert' : 'status'}>
                        {mensagemContato.texto}
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* ---- SEÇÃO 3: Endereço pessoal (6 colunas com empresa; 12 colunas quando não houver empresa) ---- */}
              <section className={`min-w-0 rounded-xl border border-slate-200 bg-white p-[21px_20px_20px] shadow-sm max-[620px]:p-[18px_16px] ${temEnderecoEmpresa ? 'lg:col-span-6' : 'lg:col-span-12'}`}>
                <CabecalhoSecao
                  subtitulo="LOCALIZAÇÃO"
                  titulo="Endereço pessoal"
                  icone="▣"
                  editando={modoEdicao.enderecoPessoal}
                  aoAlterar={() => abrirEdicao('enderecoPessoal', setMensagemEndereco)}
                />

                {modoEdicao.enderecoPessoal ? (
                  /* Formulário editável do Endereço pessoal */
                  <form onSubmit={salvarSecaoEnderecoPessoal} className="mt-4 space-y-3">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Rua ou avenida
                      <input
                        required={usuario?.tipo === 'CLIENTE'}
                        type="text"
                        maxLength={240}
                        value={dadosContato.endereco}
                        onChange={(event) => setDadosContato({ ...dadosContato, endereco: event.target.value })}
                        className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal"
                      />
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Estado
                        <input
                          required={usuario?.tipo === 'CLIENTE'}
                          value={dadosContato.estado}
                          onChange={(event) => setDadosContato({ ...dadosContato, estado: event.target.value })}
                          className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal"
                        />
                      </label>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Cidade
                        <input
                          required={usuario?.tipo === 'CLIENTE'}
                          value={dadosContato.cidade}
                          onChange={(event) => setDadosContato({ ...dadosContato, cidade: event.target.value })}
                          className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal"
                        />
                      </label>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Bairro
                        <input
                          required={usuario?.tipo === 'CLIENTE'}
                          value={dadosContato.bairro}
                          onChange={(event) => setDadosContato({ ...dadosContato, bairro: event.target.value })}
                          className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal"
                        />
                      </label>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Número
                        <input
                          required={usuario?.tipo === 'CLIENTE'}
                          inputMode="numeric"
                          value={dadosContato.numero}
                          onChange={(event) => setDadosContato({ ...dadosContato, numero: event.target.value.replace(/\D/g, '') })}
                          className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal"
                        />
                      </label>
                    </div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Complemento
                      <input
                        maxLength={240}
                        value={dadosContato.complemento}
                        onChange={(event) => setDadosContato({ ...dadosContato, complemento: event.target.value })}
                        className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal"
                      />
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Apartamento
                        <input
                          disabled={dadosContato.semApartamento}
                          required={usuario?.tipo === 'CLIENTE' && !dadosContato.semApartamento}
                          inputMode="numeric"
                          value={dadosContato.apartamento}
                          onChange={(event) => setDadosContato({ ...dadosContato, apartamento: event.target.value.replace(/\D/g, '') })}
                          className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal disabled:bg-slate-100"
                        />
                        <span className="mt-2 flex items-center gap-1 text-[10px]">
                          <input
                            type="checkbox"
                            checked={dadosContato.semApartamento}
                            onChange={(event) => setDadosContato({ ...dadosContato, semApartamento: event.target.checked, apartamento: '' })}
                          />
                          Não tem apartamento
                        </span>
                      </label>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Bloco
                        <input
                          disabled={dadosContato.semBloco}
                          required={usuario?.tipo === 'CLIENTE' && !dadosContato.semBloco}
                          value={dadosContato.bloco}
                          onChange={(event) => setDadosContato({ ...dadosContato, bloco: event.target.value.replace(/[^a-z\d]/gi, '') })}
                          className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal disabled:bg-slate-100"
                        />
                        <span className="mt-2 flex items-center gap-1 text-[10px]">
                          <input
                            type="checkbox"
                            checked={dadosContato.semBloco}
                            onChange={(event) => setDadosContato({ ...dadosContato, semBloco: event.target.checked, bloco: '' })}
                          />
                          Não tem bloco
                        </span>
                      </label>
                    </div>
                    {mensagemEndereco && (
                      <p className={`rounded-[7px] px-[10px] py-[9px] text-sm font-semibold ${mensagemEndereco.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`} role={mensagemEndereco.tipo === 'erro' ? 'alert' : 'status'}>
                        {mensagemEndereco.texto}
                      </p>
                    )}
                    <AcoesEdicaoSecao salvando={salvando} aoCancelar={cancelarSecaoEnderecoPessoal} />
                  </form>
                ) : (
                  /* Modo leitura do Endereço pessoal exibindo "Não informado" para vazios */
                  <div className="mt-4 space-y-4">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <CampoLeitura rotulo="Rua ou avenida" valor={dadosContato.endereco} />
                      </div>
                      <CampoLeitura rotulo="Estado" valor={dadosContato.estado} />
                      <CampoLeitura rotulo="Cidade" valor={dadosContato.cidade} />
                      <CampoLeitura rotulo="Bairro" valor={dadosContato.bairro} />
                      <CampoLeitura rotulo="Número" valor={dadosContato.numero} />
                      <div className="sm:col-span-2">
                        <CampoLeitura rotulo="Complemento" valor={dadosContato.complemento} />
                      </div>
                      <CampoLeitura
                        rotulo="Apartamento"
                        textoFormatado={dadosContato.semApartamento ? 'Não tem apartamento' : formatarValorLeitura(dadosContato.apartamento)}
                      />
                      <CampoLeitura
                        rotulo="Bloco"
                        textoFormatado={dadosContato.semBloco ? 'Não tem bloco' : formatarValorLeitura(dadosContato.bloco)}
                      />
                    </dl>
                    {mensagemEndereco && (
                      <p className={`rounded-[7px] px-[10px] py-[9px] text-sm font-semibold ${mensagemEndereco.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`} role={mensagemEndereco.tipo === 'erro' ? 'alert' : 'status'}>
                        {mensagemEndereco.texto}
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* ---- SEÇÃO 4: Dados da empresa (6 colunas no desktop) ---- */}
              {tipoPerfil === 'ADMIN' && (
                <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-[21px_20px_20px] shadow-sm max-[620px]:p-[18px_16px] lg:col-span-6">
                  {/* Permite identificar a empresa e editar apenas o slogan opcional. */}
                  <CabecalhoSecao
                    subtitulo="EMPRESA"
                    titulo="Dados da empresa"
                    icone="▤"
                    editando={modoEdicao.sloganEmpresa}
                    aoAlterar={() => abrirEdicao('sloganEmpresa', setMensagemSloganEmpresa)}
                  />

                  {modoEdicao.sloganEmpresa ? (
                    /* Formulário que mantém o nome da empresa somente para leitura. */
                    <form onSubmit={salvarSloganEmpresa} className="mt-4 space-y-3">
                      <CampoLeitura rotulo="Nome da empresa" valor={dadosEmpresaForm.nome} />
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Slogan (opcional)
                        <input
                          type="text"
                          maxLength={120}
                          value={dadosEmpresaForm.slogan}
                          onChange={(evento) => setDadosEmpresaForm((atuais) => ({ ...atuais, slogan: evento.target.value }))}
                          className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal"
                        />
                      </label>
                      {mensagemSloganEmpresa && (
                        <p className={`rounded-[7px] px-[10px] py-[9px] text-sm font-semibold ${mensagemSloganEmpresa.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`} role={mensagemSloganEmpresa.tipo === 'erro' ? 'alert' : 'status'}>
                          {mensagemSloganEmpresa.texto}
                        </p>
                      )}
                      <AcoesEdicaoSecao salvando={salvando} aoCancelar={cancelarSloganEmpresa} />
                    </form>
                  ) : (
                    /* Mostra nome e slogan armazenados para a empresa atual. */
                    <div className="mt-4 space-y-4">
                      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <CampoLeitura rotulo="Nome da empresa" valor={dadosEmpresaForm.nome} />
                        <CampoLeitura rotulo="Slogan" valor={dadosEmpresaForm.slogan} />
                      </dl>
                      {mensagemSloganEmpresa && (
                        <p className={`rounded-[7px] px-[10px] py-[9px] text-sm font-semibold ${mensagemSloganEmpresa.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`} role={mensagemSloganEmpresa.tipo === 'erro' ? 'alert' : 'status'}>
                          {mensagemSloganEmpresa.texto}
                        </p>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* ---- SEÇÃO 5: Endereço da empresa (6 colunas no desktop quando existir) ---- */}
              {temEnderecoEmpresa && (
                <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-[21px_20px_20px] shadow-sm max-[620px]:p-[18px_16px] lg:col-span-6">
                  <CabecalhoSecao
                    subtitulo="EMPRESA"
                    titulo="Endereço da empresa"
                    icone="▤"
                    editando={modoEdicao.enderecoEmpresa}
                    aoAlterar={() => abrirEdicao('enderecoEmpresa', setMensagemEmpresa)}
                  />

                  {modoEdicao.enderecoEmpresa ? (
                    /* Formulário editável do Endereço da empresa */
                    <form onSubmit={salvarSecaoEnderecoEmpresa} className="mt-4 space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="text-[11px] font-semibold text-slate-700 sm:col-span-2">
                          Rua/avenida
                          <input
                            value={dadosEmpresaForm.endereco}
                            onChange={(event) => setDadosEmpresaForm({ ...dadosEmpresaForm, endereco: event.target.value })}
                            className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal"
                          />
                        </label>
                        <label className="text-[11px] font-semibold text-slate-700">
                          Número
                          <input
                            inputMode="numeric"
                            value={dadosEmpresaForm.numero}
                            onChange={(event) => setDadosEmpresaForm({ ...dadosEmpresaForm, numero: event.target.value.replace(/\D/g, '') })}
                            className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal"
                          />
                        </label>
                        <label className="text-[11px] font-semibold text-slate-700">
                          Estado
                          <input
                            value={dadosEmpresaForm.estado}
                            onChange={(event) => setDadosEmpresaForm({ ...dadosEmpresaForm, estado: event.target.value })}
                            className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal"
                          />
                        </label>
                        <label className="text-[11px] font-semibold text-slate-700">
                          Cidade
                          <input
                            value={dadosEmpresaForm.cidade}
                            onChange={(event) => setDadosEmpresaForm({ ...dadosEmpresaForm, cidade: event.target.value })}
                            className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal"
                          />
                        </label>
                        <label className="text-[11px] font-semibold text-slate-700">
                          Bairro
                          <input
                            value={dadosEmpresaForm.bairro}
                            onChange={(event) => setDadosEmpresaForm({ ...dadosEmpresaForm, bairro: event.target.value })}
                            className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal"
                          />
                        </label>
                        <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 sm:col-span-2">
                          {/* Mantém a ausência de complemento apenas como estado da interface. */}
                          <input
                            type="checkbox"
                            checked={semComplementoEmpresa}
                            onChange={(evento) => {
                              setSemComplementoEmpresa(evento.target.checked)
                              if (evento.target.checked) setDadosEmpresaForm((atuais) => ({ ...atuais, complemento: '' }))
                            }}
                          />
                          Sem complemento
                        </label>
                        <label className="text-[11px] font-semibold text-slate-700 sm:col-span-2">
                          Complemento
                          <input
                            value={dadosEmpresaForm.complemento}
                            onChange={(event) => setDadosEmpresaForm({ ...dadosEmpresaForm, complemento: event.target.value })}
                            disabled={semComplementoEmpresa}
                            className="mt-1 min-h-[34px] w-full rounded-[7px] border border-slate-300 px-[10px] py-2 text-xs font-normal"
                          />
                        </label>
                      </div>
                      {mensagemEmpresa && (
                        <p className={`rounded-[7px] px-[10px] py-[9px] text-sm font-semibold ${mensagemEmpresa.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`} role={mensagemEmpresa.tipo === 'erro' ? 'alert' : 'status'}>
                          {mensagemEmpresa.texto}
                        </p>
                      )}
                      <AcoesEdicaoSecao salvando={salvando} aoCancelar={cancelarSecaoEnderecoEmpresa} />
                    </form>
                  ) : (
                    /* Modo leitura do Endereço da empresa exibindo "Não informado" para vazios */
                    <div className="mt-4 space-y-4">
                      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <CampoLeitura rotulo="Rua ou avenida" valor={dadosEmpresaForm.endereco} />
                        </div>
                        <CampoLeitura rotulo="Número" valor={dadosEmpresaForm.numero} />
                        <CampoLeitura rotulo="Estado" valor={dadosEmpresaForm.estado} />
                        <CampoLeitura rotulo="Cidade" valor={dadosEmpresaForm.cidade} />
                        <CampoLeitura rotulo="Bairro" valor={dadosEmpresaForm.bairro} />
                        <div className="sm:col-span-2">
                          <CampoLeitura rotulo="Complemento" valor={dadosEmpresaForm.complemento} />
                        </div>
                      </dl>
                      {mensagemEmpresa && (
                        <p className={`rounded-[7px] px-[10px] py-[9px] text-sm font-semibold ${mensagemEmpresa.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`} role={mensagemEmpresa.tipo === 'erro' ? 'alert' : 'status'}>
                          {mensagemEmpresa.texto}
                        </p>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* ---- SEÇÃO 6: Segurança (largura total de 12 colunas no desktop) ---- */}
              <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-[21px_20px_20px] shadow-sm max-[620px]:p-[18px_16px] lg:col-span-12">
                <CabecalhoSecao
                  subtitulo="SEGURANÇA"
                  titulo="Alteração de senha"
                  icone="⌑"
                  editando={modoEdicao.seguranca}
                  aoAlterar={() => abrirEdicao('seguranca', setMensagemSenha)}
                />
                <p className="my-[13px] mb-4 text-[11px] leading-[1.5] text-slate-500">Use sua senha atual para definir uma nova senha de acesso.</p>

                {modoEdicao.seguranca ? (
                  /* Formulário de troca de senha usando o Input reutilizável */
                  <form onSubmit={enviarTrocaSenha} noValidate className="max-w-xl">
                    <Input
                      label="Senha atual"
                      type="password"
                      name="senhaAtual"
                      autoComplete="current-password"
                      value={campos.senhaAtual}
                      onChange={atualizarCampo}
                      required
                      className="mb-3"
                      fieldClassName="min-h-[34px] rounded-[7px]"
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

                    {/* Mensagem de erro ou sucesso na troca de senha */}
                    {mensagemSenha && (
                      <p className={`mb-3 rounded-[7px] px-[10px] py-[9px] text-[11px] leading-[1.45] ${mensagemSenha.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`} role={mensagemSenha.tipo === 'erro' ? 'alert' : 'status'}>
                        {mensagemSenha.texto}
                      </p>
                    )}

                    {/* Botões Salvar e Cancelar da seção Segurança */}
                    <AcoesEdicaoSecao salvando={salvando} aoCancelar={cancelarTrocaSenha} />
                  </form>
                ) : (
                  /* Modo leitura da seção Segurança */
                  <div className="space-y-3">
                    <dl>
                      <CampoLeitura rotulo="Senha de acesso" textoFormatado="••••••••" />
                    </dl>
                    {mensagemSenha && (
                      <p className={`rounded-[7px] px-[10px] py-[9px] text-[11px] leading-[1.45] ${mensagemSenha.tipo === 'erro' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`} role={mensagemSenha.tipo === 'erro' ? 'alert' : 'status'}>
                        {mensagemSenha.texto}
                      </p>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Rodapé institucional discreto */}
          <footer className="mt-[25px] text-[9px] text-slate-400">ObraMaster © {new Date().getFullYear()} · Sistema de gestão de obras</footer>
        </main>
      </div>
    </div>
  )
}
