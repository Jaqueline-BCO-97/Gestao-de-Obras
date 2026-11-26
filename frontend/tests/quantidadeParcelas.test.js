// Importa as ferramentas de teste nativas para não adicionar dependências ao projeto.
import { describe, it } from 'node:test'
// Importa as comparações estritas usadas nas verificações do seletor.
import assert from 'node:assert/strict'
// Importa a leitura de arquivos para conferir como as telas conectam o controle compartilhado.
import { readFile } from 'node:fs/promises'
// Importa as opções, conversões e regras usadas pelos cadastros e pela edição da obra.
import { criarOpcoesQuantidadeParcelas, deveBloquearEdicaoFinanceira, localizarIndiceQuantidadeParcelas, montarPayloadCriarObra, normalizarQuantidadeParcelas, obterQuantidadeInicialObra, resolverTeclaQuantidadeParcelas } from '../src/utils/quantidadeParcelas.js'
// Lê a tela de edição para validar a ligação entre os dados da obra e o controle visual.
const paginaEdicao = await readFile(new URL('../src/pages/AdminObra.jsx', import.meta.url), 'utf8')
// Lê o componente para validar os atributos reais do botão desabilitado.
const componenteSelect = await readFile(new URL('../src/components/SelectQuantidadeParcelas.jsx', import.meta.url), 'utf8')

// Agrupa as verificações do seletor usado apenas no cadastro de obra.
describe('Seletor de quantidade de parcelas na criação de obra', () => {
  // Confirma que as 36 opções preservam os textos e valores do formulário atual.
  it('mantém todas as opções, incluindo a 36ª', () => {
    // Gera as opções pela mesma função consumida pelo componente visual.
    const opcoes = criarOpcoesQuantidadeParcelas()
    // Confirma que a lista inteira continua disponível para rolagem.
    assert.equal(opcoes.length, 36)
    // Confirma que o valor da última opção continua sendo o número 36.
    assert.equal(opcoes[35].valor, '36')
    // Confirma que a última opção conserva o texto e a regra de juros atuais.
    assert.equal(opcoes[35].texto, '36 parcelas · juros de 1% por parcela adicional')
  })

  // Confirma que a última opção pode ser alcançada e escolhida usando apenas o teclado.
  it('seleciona a opção 36 com setas e Enter e envia 36 ao salvar', () => {
    // Prepara o estado aberto no primeiro item da lista suspensa.
    let estado = { aberta: true, indiceAtivo: 0 }
    // Pressiona a seta para baixo até chegar à 36ª opção.
    for (let indice = 0; indice < 35; indice += 1) estado = resolverTeclaQuantidadeParcelas('ArrowDown', estado, 36)
    // Confirma que a navegação por teclado alcançou o índice da opção 36.
    assert.equal(estado.indiceAtivo, 35)
    // Confirma a opção ativa com Enter, como faz o componente no formulário.
    const confirmacao = resolverTeclaQuantidadeParcelas('Enter', estado, 36)
    // Confirma que o seletor fecha depois da seleção por teclado.
    assert.equal(confirmacao.aberta, false)
    // Lê o valor selecionado no mesmo formato controlado pelo formulário.
    const quantidadeSelecionada = criarOpcoesQuantidadeParcelas()[confirmacao.confirmar].valor
    // Monta o payload com o mesmo helper usado pelo botão de salvar da obra.
    const payload = montarPayloadCriarObra({ nome: 'Obra teste', quantidadeParcelas: quantidadeSelecionada }, '3600.00', [])
    // Confirma que a API receberá a quantidade 36 como número.
    assert.equal(payload.quantidadeParcelas, 36)
    // Confirma que os demais campos enviados pelo formulário continuam no payload.
    assert.equal(payload.valorTotal, '3600.00')
  })

  // Confirma que a edição inicializa o seletor com a quantidade já salva na obra.
  it('edição mostra a quantidade atual da obra selecionada', () => {
    // Representa dados devolvidos pela API para uma obra com dezenove parcelas.
    const obra = { quantidadeParcelas: 19, parcelas: [{ numero: 1 }, { numero: 2 }] }
    // Usa o helper chamado pela tela para preparar o valor string do controle.
    const quantidadeAtual = obterQuantidadeInicialObra(obra)
    // Confirma que a opção existente continua selecionada.
    assert.equal(quantidadeAtual, '19')
    // Confirma que o valor aponta para a posição visual correspondente na lista.
    assert.equal(localizarIndiceQuantidadeParcelas(quantidadeAtual), 18)
    // Confirma que a edição passa o estado atual para o componente compartilhado.
    assert.match(paginaEdicao, /value=\{form\.quantidadeParcelas\}/)
  })

  // Confirma que os campos financeiros permanecem editáveis sem parcela paga ou tentativa ativa.
  it('mantém valor base e quantidade habilitados sem pagamento', () => {
    // Representa uma parcela comum ainda não paga, sem tentativa de pagamento online.
    const parcelas = [{ situacao: 'pendente', tentativasPendentes: [] }]
    // Confirma que esse estado não ativa o bloqueio financeiro.
    assert.equal(deveBloquearEdicaoFinanceira(parcelas), false)
    // Confirma que valor base e quantidade usam a mesma condição para desabilitar.
    assert.equal((paginaEdicao.match(/disabled=\{edicaoFinanceiraBloqueada\}/g) || []).length, 2)
  })

  // Confirma que uma parcela quitada bloqueia os dois campos e mantém a explicação comum.
  it('bloqueia valor base e quantidade com parcela paga', () => {
    // Representa uma parcela confirmada como paga, como a API entrega à tela.
    const parcelas = [{ situacao: 'paga', tentativasPendentes: [] }]
    // Confirma que uma parcela paga ativa a condição de bloqueio financeiro.
    assert.equal(deveBloquearEdicaoFinanceira(parcelas), true)
    // Confirma que o valor base fica desabilitado pela condição compartilhada.
    assert.match(paginaEdicao, /disabled=\{edicaoFinanceiraBloqueada\}/)
    // Confirma que o seletor mostra a mesma explicação sob o controle bloqueado.
    assert.match(paginaEdicao, /disabledReason=\{edicaoFinanceiraBloqueada \? explicacaoBloqueioParcelas : ''\}/)
    // Confirma que o campo de valor também apresenta essa explicação junto a ele.
    assert.match(paginaEdicao, /<span className="mt-1 block text-xs text-slate-500">\{explicacaoBloqueioParcelas\}<\/span>/)
  })

  // Confirma que uma tentativa online pendente bloqueia os dois campos e mostra a explicação comum.
  it('bloqueia valor base e quantidade com tentativa pendente', () => {
    // Representa parcela não paga com uma tentativa online ainda em processamento.
    const parcelas = [{ situacao: 'pendente', tentativasPendentes: [{ id: 'pagamento-pendente' }] }]
    // Confirma que o registro de tentativa ativa a condição de bloqueio financeiro.
    assert.equal(deveBloquearEdicaoFinanceira(parcelas), true)
    // Confirma que os dois campos compartilham a condição de bloqueio.
    assert.equal((paginaEdicao.match(/disabled=\{edicaoFinanceiraBloqueada\}/g) || []).length, 2)
    // Confirma que a mensagem junto ao valor usa o texto compartilhado do seletor.
    assert.match(paginaEdicao, /<span className="mt-1 block text-xs text-slate-500">\{explicacaoBloqueioParcelas\}<\/span>/)
  })

  // Confirma que bloquear a edição não remove nem altera o valor que o PATCH recebe.
  it('preserva o valor base atual no envio do PATCH', () => {
    // Confirma que a tela continua exibindo o valor guardado no estado do formulário.
    assert.match(paginaEdicao, /value=\{form\.valorTotal\}/)
    // Confirma que o valor digitado continua sendo tratado pelo mesmo formatador.
    assert.match(paginaEdicao, /valorTotal: moedaEntrada\(e\.target\.value\)/)
    // Confirma que o envio continua normalizando o mesmo valor do estado atual.
    assert.match(paginaEdicao, /const valor = moedaNormalizada\(form\.valorTotal\)/)
    // Confirma que o payload atual ainda inclui valorTotal sem alterar o contrato.
    assert.match(paginaEdicao, /atualizarObra\(id, \{ \.\.\.dadosGerais, valorTotal: valor, quantidadeParcelas:/)
  })

  // Confirma que o campo bloqueado não abre a lista e apresenta a explicação junto a ele.
  it('campo desabilitado não abre a lista e mostra o motivo do bloqueio', () => {
    // Prepara uma lista fechada e informa ao redutor que o campo está desabilitado.
    const proximaAcao = resolverTeclaQuantidadeParcelas('ArrowDown', { aberta: false, indiceAtivo: -1 }, 36, -1, true)
    // Confirma que nenhuma tecla abre ou altera a lista bloqueada.
    assert.equal(proximaAcao, null)
    // Confirma que o botão recebe o atributo disabled nativo.
    assert.match(componenteSelect, /disabled=\{disabled\}/)
    // Confirma que a explicação é renderizada junto ao controle desabilitado.
    assert.match(componenteSelect, /disabled && disabledReason/)
    // Confirma que o controle usa o mesmo fundo desabilitado dos campos do formulário.
    assert.match(componenteSelect, /disabled:bg-slate-100/)
    // Confirma que a tela bloqueia com parcela paga ou tentativa pendente.
    assert.match(paginaEdicao, /deveBloquearEdicaoFinanceira\(parcelas\)/)
    // Confirma que a tela repete a mensagem já retornada pelo backend.
    assert.match(paginaEdicao, /Valor, quantidade e vencimentos não podem mudar depois de iniciada uma tentativa ou confirmado um pagamento/)
  })

  // Confirma que a edição percorre o teclado até a opção 36 e envia o valor como número.
  it('edição envia a opção 36 como número sem incluir vencimento no PATCH genérico', () => {
    // Abre a navegação pelo teclado no primeiro item da lista.
    let estado = { aberta: true, indiceAtivo: 0 }
    // Avança com setas até a última das 36 opções.
    for (let indice = 0; indice < 35; indice += 1) estado = resolverTeclaQuantidadeParcelas('ArrowDown', estado, 36)
    // Confirma a opção ativa com Enter.
    const confirmacao = resolverTeclaQuantidadeParcelas('Enter', estado, 36)
    // Recupera o valor textual escolhido na lista.
    const quantidadeSelecionada = criarOpcoesQuantidadeParcelas()[confirmacao.confirmar].valor
    // Converte para o mesmo tipo numérico enviado pelo formulário de edição.
    assert.equal(normalizarQuantidadeParcelas(quantidadeSelecionada), 36)
    // Confirma que a tela envia a quantidade convertida no payload atual.
    assert.match(paginaEdicao, /quantidadeParcelas: normalizarQuantidadeParcelas\(form\.quantidadeParcelas\)/)
    // Confirma que a tela remove o vencimento antes do PATCH genérico.
    assert.match(paginaEdicao, /delete dadosGerais\.vencimentoInicial/)
    // Confirma que a data usa a rota dedicada.
    assert.match(paginaEdicao, /atualizarVencimentoObra\(id, form\.vencimentoInicial\)/)
  })
})
