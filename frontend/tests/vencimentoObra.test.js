// Usa os testes nativos do Node para as regras puras da interface.
import { describe, it } from 'node:test'
// Usa comparações estritas para validar estados e textos.
import assert from 'node:assert/strict'
// Lê a tela e o serviço para verificar a ligação com a rota dedicada.
import { readFile } from 'node:fs/promises'
// Importa o texto e a condição compartilhada pelo formulário.
import { explicacaoBloqueioVencimento, podeAlterarVencimentoObra } from '../src/utils/vencimentoObra.js'

// Carrega o formulário para validar estados e chamadas reais da tela.
const paginaEdicao = await readFile(new URL('../src/pages/AdminObra.jsx', import.meta.url), 'utf8')
// Carrega o serviço para validar a URL e o corpo enviados à API.
const servicoAutenticado = await readFile(new URL('../src/services/auth.js', import.meta.url), 'utf8')

// Agrupa regras de habilitação, payload e mensagens de vencimento.
describe('Edição de vencimento da obra na tela ADMIN', () => {
  // Libera somente obra agendada com parcelas sem movimento.
  it('habilita a data em obra Agendada sem movimento', () => {
    const obra = { status: 'Agendada', parcelas: [{ situacao: 'pendente', temMovimentoPagamento: false }] }
    assert.equal(podeAlterarVencimentoObra(obra), true)
  })

  // Bloqueia status iniciado, ausência de parcelas e movimento registrado.
  it('bloqueia a data fora do status permitido ou com pagamento', () => {
    assert.equal(podeAlterarVencimentoObra({ status: 'Em andamento', parcelas: [{ situacao: 'pendente' }] }), false)
    assert.equal(podeAlterarVencimentoObra({ status: 'Agendada', parcelas: [] }), false)
    assert.equal(podeAlterarVencimentoObra({ status: 'Agendada', parcelas: [{ situacao: 'paga' }] }), false)
    assert.equal(podeAlterarVencimentoObra({ status: 'Agendada', parcelas: [{ situacao: 'pendente', comprovanteUrl: '/comprovante' }] }), false)
    assert.equal(podeAlterarVencimentoObra({ status: 'Agendada', parcelas: [{ situacao: 'pendente', temMovimentoPagamento: true }] }), false)
  })

  // Mantém junto ao campo a explicação pedida para os bloqueios.
  it('exibe a explicação completa quando o campo está bloqueado', () => {
    assert.equal(explicacaoBloqueioVencimento, 'Só é possível alterar o vencimento enquanto a obra não começou e nenhuma parcela tiver pagamento.')
    assert.match(paginaEdicao, /!vencimentoPodeAlterar && <span/)
    assert.match(paginaEdicao, /disabled=\{!vencimentoPodeAlterar \|\| salvando\}/)
  })

  // Mantém o campo obrigatório e a ação separada do formulário geral.
  it('mantém data obrigatória e botão independente para atualizar vencimentos', () => {
    assert.match(paginaEdicao, /required type="date" value=\{form\.vencimentoInicial\}/)
    assert.match(paginaEdicao, /<Button type="button" disabled=\{!vencimentoPodeAlterar \|\| salvando \|\| !form\.vencimentoInicial\}/)
    assert.match(paginaEdicao, /Atualizar vencimentos/)
  })

  // Garante que editar os dados gerais não manda vencimento pelo PATCH legado.
  it('remove vencimento do PATCH genérico e usa o endpoint dedicado', () => {
    assert.match(paginaEdicao, /delete dadosGerais\.vencimentoInicial/)
    assert.match(paginaEdicao, /atualizarObra\(id, \{ \.\.\.dadosGerais, valorTotal: valor, quantidadeParcelas:/)
    assert.match(paginaEdicao, /atualizarVencimentoObra\(id, form\.vencimentoInicial\)/)
    assert.match(servicoAutenticado, /\/obras\/\$\{encodeURIComponent\(id\)\}\/vencimento/)
    assert.match(servicoAutenticado, /JSON\.stringify\(\{ vencimentoInicial \}\)/)
  })

  // Mostra a mensagem de sucesso que lembra do PDF do contrato.
  it('mostra sucesso com lembrete para atualizar o PDF do contrato', () => {
    assert.match(paginaEdicao, /Datas das parcelas atualizadas\. Se houver contrato anexado, atualize o PDF com as novas datas\./)
    assert.match(paginaEdicao, /feedback\.vencimento/)
  })
})
