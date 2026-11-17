import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button.jsx'
import { buscarObra, iniciarPagamento, retomarPagamento } from '../services/auth.js'
import { obterChavePagamento, limparChavePagamento } from '../utils/idempotenciaPagamento.js'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ClientePagamento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [obra, setObra] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [pagando, setPagando] = useState('')
  const [mensagem, setMensagem] = useState('')
  const checkoutEmAndamento = useRef(false)

  useEffect(() => {
    let ativo = true
    let consultaEmAndamento = false
    async function consultar() {
      if (!ativo || document.visibilityState === 'hidden' || consultaEmAndamento) return
      consultaEmAndamento = true
      try {
        const dados = await buscarObra(id)
        if (ativo) {
          setObra(dados)
          setErro('')
          // O retorno do provedor é apenas um motivo para consultar novamente; não confirma pagamento.
          if (new URLSearchParams(window.location.search).has('collection_status')) setMensagem('Estamos verificando a confirmação do pagamento. A situação será atualizada após a validação do Mercado Pago.')
        }
      } catch (falha) {
        if (ativo) setErro(falha.message)
      } finally {
        consultaEmAndamento = false
        if (ativo) setCarregando(false)
      }
    }
    function aoRetomar() { if (document.visibilityState === 'visible') consultar() }
    consultar()
    const intervalo = window.setInterval(consultar, 30000)
    document.addEventListener('visibilitychange', aoRetomar)
    window.addEventListener('focus', aoRetomar)
    return () => {
      ativo = false
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', aoRetomar)
      window.removeEventListener('focus', aoRetomar)
    }
  }, [id])

  async function pagar(parcela, valorEscolhido = Number(parcela?.saldoDisponivel ?? parcela?.valor)) {
    if (!parcela?.id || checkoutEmAndamento.current) return
    const valor = Number(valorEscolhido)
    checkoutEmAndamento.current = true
    setPagando(parcela.id)
    setErro('')
    setMensagem('')
    try {
      const dadosTentativa = { obraId: id, parcelaId: parcela.id, valor }
      const chave = obterChavePagamento(sessionStorage, dadosTentativa)
      const resposta = await iniciarPagamento(id, parcela.id, valor, chave)
      if (!resposta.checkoutUrl) throw new Error('A API não retornou o endereço do checkout.')
      window.location.assign(resposta.checkoutUrl)
    } catch (falha) {
      setErro(falha.message)
      // Erros de validação são definitivos; rede e 5xx conservam a chave para recuperar a tentativa.
      if ((falha.status && falha.status < 500) || falha.tentativaFinalizada) limparChavePagamento(sessionStorage, { obraId: id, parcelaId: parcela.id, valor })
      setPagando('')
      checkoutEmAndamento.current = false
    }
  }

  async function retomar(parcela, tentativa) {
    if (!parcela?.id || !tentativa?.id || checkoutEmAndamento.current) return
    checkoutEmAndamento.current = true
    setPagando(parcela.id)
    setErro('')
    setMensagem('')
    try {
      const resposta = await retomarPagamento(id, tentativa.id)
      if (!resposta.checkoutUrl) throw new Error('A API não retornou o endereço do checkout.')
      window.location.assign(resposta.checkoutUrl)
    } catch (falha) {
      setErro(falha.message)
      setPagando('')
      checkoutEmAndamento.current = false
    }
  }

  if (carregando) return <main className="min-h-screen p-8 text-center" role="status">Carregando dados de pagamento…</main>
  if (!obra) return <main className="min-h-screen p-8 text-center"><p role="alert">{erro || 'Obra não encontrada.'}</p><Button variant="outline" onClick={() => navigate('/cliente')}>Voltar</Button></main>

  const parcelas = [obra.parcela1, obra.parcela2].filter(Boolean)
  const saldo = parcelas.reduce((total, parcela) => total + Number(parcela.saldoDevedor ?? (parcela.situacao === 'paga' ? 0 : parcela.valor || 0)), 0)
  const conclusaoConfirmada = obra.status === 'Concluída'

  return (
    <main className="min-h-screen bg-background p-6 text-ink">
      <section className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div><h1 className="text-2xl font-bold text-navy">Pagamento da obra</h1><p className="mt-1 text-slate-600">{obra.titulo} · Situação: {obra.status}</p></div>
        {erro && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{erro}</p>}
        {mensagem && <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900" role="status">{mensagem}</p>}
        <div className="space-y-3" aria-label="Parcelas">
          {parcelas.map((parcela) => {
            const segundaBloqueada = parcela.numero === 2 && !conclusaoConfirmada
            const indisponivel = parcela.situacao === 'paga' || segundaBloqueada
            return <article key={parcela.id || parcela.numero} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
              <div><h2 className="font-semibold">{parcela.numero}ª parcela</h2><p className="text-sm text-slate-600">Saldo: {moeda.format(parcela.saldoDevedor ?? (parcela.situacao === 'paga' ? 0 : parcela.valor))} · {parcela.situacao === 'paga' ? 'Paga' : 'Pendente'}</p>{Number(parcela.valorReservado || 0) > 0 && <p className="text-xs text-amber-800">{moeda.format(parcela.valorReservado)} reservado em uma tentativa ainda não confirmada.</p>}{segundaBloqueada && <p className="mt-1 text-xs text-amber-800">Disponível após a confirmação da conclusão da obra.</p>}</div>
              <div className="flex flex-wrap gap-2">
                {parcela.situacao === 'paga' ? <span className="font-semibold text-emerald-700">Confirmada</span> : <>
                  {(parcela.tentativasPendentes || []).map((tentativa) => <Button key={tentativa.id} variant="outline" disabled={indisponivel || Boolean(pagando)} onClick={() => retomar(parcela, tentativa)}>{pagando === parcela.id ? 'Retomando checkout…' : `Retomar tentativa · ${moeda.format(tentativa.valor)}`}</Button>)}
                  <Button variant="primary" disabled={indisponivel || Boolean(pagando) || Number(parcela.saldoDisponivel ?? parcela.valor) <= 0} onClick={() => pagar(parcela)}>{pagando === parcela.id ? 'Iniciando checkout…' : 'Pagar saldo disponível'}</Button>
                </>}
              </div>
            </article>
          })}
          {!parcelas.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Esta obra ainda não possui parcelas cadastradas.</p>}
        </div>
        <p className="border-t border-slate-200 pt-4 text-lg font-bold">Saldo pendente: {moeda.format(saldo)}</p>
        <Button variant="outline" onClick={() => navigate(`/cliente/obra/${obra.id}`)} icon="←">Voltar para a obra</Button>
      </section>
    </main>
  )
}
