// Importa o estado do React para manter os campos do cadastro sincronizados.
import { useState } from 'react'
// Importa os componentes de navegação para retornar ao login e abrir o painel.
import { Link, useNavigate } from 'react-router-dom'
// Importa as ações existentes para cadastrar a empresa e persistir a sessão.
import { registrarEmpreiteira, salvarSessao } from '../services/auth.js'
// Importa a validação e a máscara existentes para CPF.
import { cpfValido, formatarCpf } from '../utils/cpf.js'
// Importa a validação e a máscara existentes para CNPJ.
import { cnpjValido, formatarCnpj } from '../utils/cnpj.js'
// Importa o formatador de telefone já utilizado pelo sistema.
import { formatarTelefoneBR } from '../utils/telefone.js'
// Importa o campo compartilhado que mostra a dica de documento ao receber foco.
import CampoDocumento from '../components/CampoDocumento.jsx'
// Importa a função que remove flags apenas visuais antes de enviar o cadastro.
import { montarPayloadCadastroEmpresa } from '../utils/cadastroEmpresa.js'

// Define os campos principais do cadastro e indica quais são opcionais.
const campos = [
  { nome: 'empresa', rotulo: 'Nome da empresa', tipo: 'text' },
  { nome: 'slogan', rotulo: 'Slogan da empresa (opcional)', tipo: 'text', opcional: true },
  { nome: 'cnpj', rotulo: 'CNPJ', tipo: 'text' },
  { nome: 'nome', rotulo: 'Nome completo do responsável', tipo: 'text' },
  { nome: 'cpfResponsavel', rotulo: 'CPF do responsável', tipo: 'text' },
  { nome: 'email', rotulo: 'E-mail', tipo: 'email' },
  { nome: 'telefone', rotulo: 'Telefone principal', tipo: 'tel' },
  { nome: 'telefoneSecundario', rotulo: 'Telefone adicional (opcional)', tipo: 'tel', opcional: true },
  { nome: 'enderecoResponsavel', rotulo: 'Endereço residencial do responsável', tipo: 'text' },
  { nome: 'endereco', rotulo: 'Rua ou avenida da empresa', tipo: 'text' },
  { nome: 'senha', rotulo: 'Senha (mínimo 8 caracteres)', tipo: 'password' },
]

// Reúne os nomes dos campos que devem ocupar toda a largura da grade.
const camposLargos = ['empresa', 'slogan', 'enderecoResponsavel', 'endereco']

// Tela pública de cadastro de uma empreiteira e sua primeira conta administradora.
export default function RegistroEmpreiteira() {
  // Guarda os valores preenchidos, inclusive a caixa temporária de complemento.
  const [dados, setDados] = useState({
    empresa: '',
    slogan: '',
    cnpj: '',
    nome: '',
    cpfResponsavel: '',
    email: '',
    telefone: '',
    telefoneSecundario: '',
    enderecoResponsavel: '',
    endereco: '',
    estado: '',
    cidade: '',
    bairro: '',
    numero: '',
    complemento: '',
    semComplemento: false,
    senha: '',
  })
  // Guarda o erro atual de validação ou de resposta da API.
  const [erro, setErro] = useState('')
  // Indica que o cadastro está sendo enviado.
  const [carregando, setCarregando] = useState(false)
  // Permite abrir o painel após o cadastro concluído.
  const navigate = useNavigate()

  // Aplica a máscara correspondente sem alterar os demais campos.
  function alterar(evento) {
    // Lê o nome e o valor do campo editado.
    const { name, value } = evento.target
    // Formata documentos e telefones com os helpers já existentes.
    const texto = name === 'cnpj' ? formatarCnpj(value) : name === 'cpfResponsavel' ? formatarCpf(value) : name.startsWith('telefone') ? formatarTelefoneBR(value) : value
    // Atualiza apenas o campo digitado, mantendo os valores restantes.
    setDados((atuais) => ({ ...atuais, [name]: texto }))
  }

  // Valida documentos e envia os campos do cadastro da empresa.
  async function enviar(evento) {
    // Evita que o navegador recarregue a tela ao enviar o formulário.
    evento.preventDefault()
    // Limpa o erro anterior e ativa o indicador de envio.
    setErro('')
    setCarregando(true)
    try {
      // Confere CNPJ antes de fazer a requisição.
      if (!cnpjValido(dados.cnpj)) throw new Error('CNPJ inválido. Digite os 14 números sem pontos ou traços; a formatação é aplicada automaticamente.')
      // Confere CPF do responsável antes de fazer a requisição.
      if (!cpfValido(dados.cpfResponsavel)) throw new Error('CPF inválido. Digite os 11 números sem pontos ou traços; a formatação é aplicada automaticamente.')
      // Reúne os campos obrigatórios que completam o endereço da empresa.
      const enderecoCompleto = [dados.estado, dados.cidade, dados.bairro, dados.numero]
      // Mantém validação no JavaScript além dos atributos obrigatórios do formulário.
      if (enderecoCompleto.some((valor) => !valor.trim())) throw new Error('Preencha estado, cidade, bairro e número do endereço da empresa.')
      // Envia apenas dados persistíveis e limpa complemento quando a caixa estiver marcada.
      const payload = montarPayloadCadastroEmpresa(dados)
      // Cria a empresa por meio da rota genérica usada por todos os cadastros.
      const sessao = await registrarEmpreiteira(payload)
      // Persiste o retorno da API e abre o painel administrativo.
      salvarSessao(sessao, true)
      // Direciona a conta recém-cadastrada ao painel inicial.
      navigate('/admin')
    } catch (falha) {
      // Apresenta a mensagem de validação ou da API sem ocultar o motivo.
      setErro(falha.message)
    } finally {
      // Reativa o botão mesmo quando a requisição ou validação falha.
      setCarregando(false)
    }
  }

  // Renderiza o formulário preservando os estilos existentes da página.
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <form onSubmit={enviar} className="mx-auto max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow sm:p-8">
        {/* Oferece o caminho de volta sem alterar a navegação existente. */}
        <Link to="/login" className="text-sm text-sky-700">← Voltar ao login</Link>
        {/* Identifica o formulário de cadastro da empresa. */}
        <h1 className="text-2xl font-bold text-[#0c2d43]">Cadastrar Empresa</h1>
        {/* Explica os dados solicitados para empresa e responsável. */}
        <p className="text-sm text-slate-600">Informe os dados da empresa e do responsável pela conta.</p>

        {/* Agrupa os dados de identificação, contato e acesso da empresa. */}
        <div className="grid gap-3 sm:grid-cols-2">
          {campos.map(({ nome, rotulo, tipo, opcional }) => {
            // Identifica os dois campos de documento que recebem tooltip ao focar.
            const documento = nome === 'cnpj' || nome === 'cpfResponsavel'
            // Mantém as larguras atuais e destaca nome, slogan e endereços longos.
            const classeLabel = `block text-sm font-medium ${camposLargos.includes(nome) ? 'sm:col-span-2' : ''}`
            // Reúne atributos comuns dos inputs controlados da lista.
            const propriedades = {
              required: !opcional,
              maxLength: nome === 'cnpj' ? 18 : nome === 'cpfResponsavel' ? 14 : nome === 'slogan' ? 120 : undefined,
              minLength: nome === 'cnpj' ? 18 : nome === 'cpfResponsavel' ? 14 : nome === 'senha' ? 8 : undefined,
              inputMode: documento ? 'numeric' : undefined,
              type: tipo,
              name: nome,
              autoComplete: nome === 'senha' ? 'new-password' : undefined,
              value: dados[nome],
              onChange: alterar,
              className: 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2',
            }

            // Renderiza cada campo com o componente de documento quando necessário.
            return (
              <label key={nome} className={classeLabel}>
                {rotulo}
                {documento ? <CampoDocumento {...propriedades} /> : <input {...propriedades} />}
              </label>
            )
          })}
        </div>

        {/* Agrupa os campos adicionais do endereço da empresa. */}
        <fieldset className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
          {/* Informa o propósito do conjunto de campos de endereço. */}
          <legend className="px-1 text-sm font-semibold">Endereço completo da empresa</legend>
          {/* Solicita o estado e cidade como parte do endereço cadastral. */}
          <label className="block text-sm font-medium">
            Estado
            <input required name="estado" value={dados.estado} onChange={alterar} maxLength={120} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          {/* Solicita a cidade do endereço da empresa. */}
          <label className="block text-sm font-medium">
            Cidade
            <input required name="cidade" value={dados.cidade} onChange={alterar} maxLength={120} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          {/* Solicita o bairro do endereço da empresa. */}
          <label className="block text-sm font-medium">
            Bairro
            <input required name="bairro" value={dados.bairro} onChange={alterar} maxLength={120} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          {/* Solicita o número do imóvel, aceitando somente dígitos na interface. */}
          <label className="block text-sm font-medium">
            Número
            <input required inputMode="numeric" name="numero" value={dados.numero} onChange={(evento) => setDados((atuais) => ({ ...atuais, numero: evento.target.value.replace(/\D/g, '') }))} maxLength={40} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          {/* Permite informar que o endereço não possui complemento. */}
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={dados.semComplemento} onChange={(evento) => setDados((atuais) => ({ ...atuais, semComplemento: evento.target.checked, complemento: evento.target.checked ? '' : atuais.complemento }))} />
            Sem complemento
          </label>
          {/* Mantém complemento opcional e desabilita o campo quando não existe. */}
          <label className="block text-sm font-medium sm:col-span-2">
            Complemento (opcional)
            <input name="complemento" value={dados.complemento} onChange={alterar} disabled={dados.semComplemento} maxLength={240} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-50" />
          </label>
        </fieldset>

        {/* Exibe erros de validação e de resposta da API. */}
        {erro && <p role="alert" className="rounded bg-red-50 p-3 text-sm font-semibold text-red-800">{erro}</p>}
        {/* Desativa o envio durante o cadastro para evitar requisições repetidas. */}
        <button disabled={carregando} className="w-full rounded-lg bg-[#0c2d43] p-3 font-semibold text-white">
          {carregando ? 'Cadastrando…' : 'Cadastrar empresa'}
        </button>
      </form>
    </main>
  )
}
