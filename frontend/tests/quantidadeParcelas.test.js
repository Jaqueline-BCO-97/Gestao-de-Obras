// Importa as ferramentas de teste nativas para não adicionar dependências ao projeto.
import { describe, it } from 'node:test'
// Importa as comparações estritas usadas nas verificações do seletor.
import assert from 'node:assert/strict'
// Importa a leitura de arquivos para conferir como as telas conectam o controle compartilhado.
import { readFile } from 'node:fs/promises'
// Importa as opções, conversões e regras usadas pelos cadastros e pela edição da obra.
import { criarOpcoesQuantidadeParcelas, localizarIndiceQuantidadeParcelas, montarPayloadCriarObra, normalizarQuantidadeParcelas, obterQuantidadeInicialObra, resolverTeclaQuantidadeParcelas } from '../src/utils/quantidadeParcelas.js'
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
    assert.match(paginaEdicao, /parcelaPaga \|\| pagamentoEmProcessamento/)
    // Confirma que a tela repete a mensagem já retornada pelo backend.
    assert.match(paginaEdicao, /Valor, quantidade e vencimentos não podem mudar depois de iniciada uma tentativa ou confirmado um pagamento/)
  })

  // Confirma que a edição percorre o teclado até a opção 36 e envia o valor como número.
  it('edição envia a opção 36 como número sem alterar o campo de vencimento', () => {
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
    // Confirma que o campo de vencimento continua no formulário e no payload.
    assert.match(paginaEdicao, /vencimentoInicial: form\.vencimentoInicial/)
  })
})
