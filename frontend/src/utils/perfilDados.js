// Importa o formatador de CPF já existente no projeto.
import { formatarCpf } from './cpf.js'
// Importa o formatador de telefone brasileiro já existente no projeto.
import { formatarTelefoneBR } from './telefone.js'

// Texto padrão exibido no modo leitura quando um campo estiver vazio.
export const TEXTO_NAO_INFORMADO = 'Não informado'

// Mapeia o enum TipoUsuario do banco para um rótulo legível na seção de identidade.
const ROTULOS_PERFIL = {
  // Perfil de administrador da empreiteira.
  ADMIN: 'Administrador',
  // Perfil de cliente acompanhando obras.
  CLIENTE: 'Cliente',
  // Perfil de colaborador/gerente de obra.
  COLABORADOR: 'Gerente de obra',
}

// Lê os dados do usuário salvos no navegador quando a API não responde.
export function obterUsuarioLocal() {
  // Tenta ler e converter o JSON salvo no localStorage ou no sessionStorage.
  try {
    // Prioriza o armazenamento persistente (localStorage) e usa sessionStorage como alternativa.
    const dados = localStorage.getItem('usuario') || sessionStorage.getItem('usuario')
    // Retorna o objeto convertido ou null se não existir sessão salva.
    return dados ? JSON.parse(dados) : null
  } catch {
    // Em caso de JSON inválido, evita quebrar a tela e retorna null.
    return null
  }
}

// Monta o objeto de rascunho dos dados pessoais e de endereço do usuário.
export function dadosPessoais(usuario = {}) {
  // Garante objeto seguro caso chegue null ou undefined.
  const origem = usuario || {}
  // Retorna todos os campos normalizados para os inputs controlados.
  return {
    // E-mail do usuário.
    email: origem.email || '',
    // Telefone principal formatado.
    telefone: formatarTelefoneBR(origem.telefone || ''),
    // Telefone adicional formatado.
    telefoneSecundario: formatarTelefoneBR(origem.telefoneSecundario || ''),
    // Logradouro (rua ou avenida) pessoal.
    endereco: origem.endereco || '',
    // Estado (UF) pessoal.
    estado: origem.estado || '',
    // Cidade pessoal.
    cidade: origem.cidade || '',
    // Bairro pessoal.
    bairro: origem.bairro || '',
    // Número do endereço pessoal.
    numero: origem.numero || '',
    // Complemento do endereço pessoal.
    complemento: origem.complemento || '',
    // Número do apartamento, se houver.
    apartamento: origem.apartamento || '',
    // Identificador do bloco, se houver.
    bloco: origem.bloco || '',
    // Marcação indicando que o endereço não possui apartamento.
    semApartamento: origem.semApartamento ?? false,
    // Marcação indicando que o endereço não possui bloco.
    semBloco: origem.semBloco ?? false,
    // CPF formatado com máscara.
    cpf: formatarCpf(origem.cpf || ''),
  }
}

// Monta o objeto de rascunho dos dados de endereço da empresa do administrador.
export function dadosEmpresa(empresa = {}) {
  // Garante objeto seguro caso a empresa não tenha sido enviada.
  const origem = empresa || {}
  // Retorna todos os campos da empresa normalizados para os inputs controlados.
  return {
    // Logradouro da empresa.
    endereco: origem.endereco || '',
    // Estado da empresa.
    estado: origem.estado || '',
    // Cidade da empresa.
    cidade: origem.cidade || '',
    // Bairro da empresa.
    bairro: origem.bairro || '',
    // Número do imóvel da empresa.
    numero: origem.numero || '',
    // Complemento da empresa.
    complemento: origem.complemento || '',
    // Telefone principal da empresa.
    telefone: formatarTelefoneBR(origem.telefone || ''),
    // Telefone adicional da empresa.
    telefoneSecundario: formatarTelefoneBR(origem.telefoneSecundario || ''),
    // Endereço do responsável pela empresa.
    enderecoResponsavel: origem.enderecoResponsavel || '',
  }
}

// Cria de forma unificada todos os estados iniciais de formulário a partir de um usuário.
export function criarEstadosFormularioPerfil(usuario) {
  // Normaliza para objeto vazio quando não há usuário carregado.
  const base = usuario || {}
  // Devolve os três estados derivados que precisam ficar sincronizados no carregamento e no fallback.
  return {
    // Campos pessoais e de contato.
    dadosContato: dadosPessoais(base),
    // Campos de endereço da empresa (quando existir).
    dadosEmpresaForm: dadosEmpresa(base.empresa || {}),
    // Só abre o campo de telefone adicional se já existir número cadastrado.
    mostrarTelefoneAdicional: Boolean(base.telefoneSecundario),
  }
}

// Formata valores para o modo leitura exibindo "Não informado" quando estiverem vazios.
export function formatarValorLeitura(valor) {
  // Converte para texto quando existir e remove espaços extras nas pontas.
  const texto = valor === null || valor === undefined ? '' : String(valor).trim()
  // Retorna o próprio texto preenchido ou o rótulo padrão "Não informado".
  return texto || TEXTO_NAO_INFORMADO
}

// Traduz o perfil técnico para exibição amigável na seção de identidade.
export function traduzirTipoPerfil(tipo) {
  // Retorna o rótulo correspondente ou "Não informado" se vier vazio.
  return ROTULOS_PERFIL[tipo] || formatarValorLeitura(tipo)
}

// Indica se a tela deve exibir o bloco de endereço da empresa.
export function usuarioPossuiEnderecoEmpresa(usuario) {
  // O endereço da empresa aparece quando o usuário é ADMIN ou traz dados de empresa na sessão.
  return Boolean(usuario && (usuario.tipo === 'ADMIN' || usuario.empresa))
}

// Monta o payload de envio apenas com os campos da seção de contato.
export function montarPayloadContato(dadosContato = {}) {
  // Envia só e-mail, telefones e CPF para não acionar validações de endereço sem necessidade.
  return {
    // E-mail informado no formulário.
    email: dadosContato.email || '',
    // Telefone principal informado no formulário.
    telefone: dadosContato.telefone || '',
    // Telefone adicional informado no formulário.
    telefoneSecundario: dadosContato.telefoneSecundario || '',
    // CPF informado no formulário.
    cpf: dadosContato.cpf || '',
  }
}

// Monta o payload de envio apenas com os campos da seção de endereço pessoal.
export function montarPayloadEnderecoPessoal(dadosContato = {}) {
  // Envia somente campos de endereço pessoal para manter as edições independentes por seção.
  return {
    // Rua ou avenida.
    endereco: dadosContato.endereco || '',
    // Estado (UF).
    estado: dadosContato.estado || '',
    // Cidade.
    cidade: dadosContato.cidade || '',
    // Bairro.
    bairro: dadosContato.bairro || '',
    // Número do endereço.
    numero: dadosContato.numero || '',
    // Complemento do endereço.
    complemento: dadosContato.complemento || '',
    // Apartamento (limpo quando "Não tem apartamento" estiver marcado).
    apartamento: dadosContato.semApartamento ? '' : (dadosContato.apartamento || ''),
    // Bloco (limpo quando "Não tem bloco" estiver marcado).
    bloco: dadosContato.semBloco ? '' : (dadosContato.bloco || ''),
    // Flag booleana indicando ausência de apartamento.
    semApartamento: Boolean(dadosContato.semApartamento),
    // Flag booleana indicando ausência de bloco.
    semBloco: Boolean(dadosContato.semBloco),
  }
}

// Mescla o usuário retornado pelo PATCH /usuarios/me preservando campos da empresa já carregados.
export function mesclarUsuarioAtualizado(usuarioAnterior, usuarioAtualizado) {
  // Se não houver empresa anterior nem nova, retorna o usuário atualizado direto.
  if (!usuarioAnterior?.empresa && !usuarioAtualizado?.empresa) {
    // Devolve o objeto atualizado sem criar propriedade empresa vazia.
    return usuarioAtualizado
  }
  // Junta os dados anteriores da empresa (como nome e CNPJ) com os campos recém-salvos.
  return {
    // Mantém todos os campos retornados pelo backend para o usuário.
    ...usuarioAtualizado,
    // Preserva os metadados anteriores da empresa ao atualizar apenas o endereço da empresa.
    empresa: {
      ...(usuarioAnterior?.empresa || {}),
      ...(usuarioAtualizado?.empresa || {}),
    },
  }
}
