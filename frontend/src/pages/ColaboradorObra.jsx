import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button.jsx'
import HistoricoObra from '../components/HistoricoObra.jsx'
import { buscarObra, registrarAndamentoObra } from '../services/auth.js'

const tiposRegistro = [
  { rotulo: 'Atualização de andamento', valor: 'ATUALIZACAO' },
  { rotulo: 'Anotação', valor: 'ANOTACAO' },
  { rotulo: 'Ocorrência', valor: 'OCORRENCIA' },
]

function coresStatus(status = '') {
  if (status === 'Em andamento') return { fundo: 'bg-amber-100', texto: 'text-amber-800', ponto: 'bg-amber-500' }
  if (status === 'Agendada') return { fundo: 'bg-sky-100', texto: 'text-sky-800', ponto: 'bg-sky-500' }
  if (status === 'Concluída' || status === 'Aguardando conferência') return { fundo: 'bg-purple-100', texto: 'text-purple-800', ponto: 'bg-purple-500' }
  return { fundo: 'bg-slate-100', texto: 'text-slate-700', ponto: 'bg-slate-400' }
}

function mensagemFalha(erro) {
  if (erro.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.'
  if (erro.status === 403) return 'Você não tem mais autorização para acessar ou registrar andamento nesta obra.'
  if (erro.status === 404) return 'Obra não encontrada ou fora das obras liberadas para sua conta.'
  if (erro.status === 409) return 'A alocação mudou durante a operação. Atualize a obra e tente novamente.'
  if (erro.status === 503) return 'O serviço está temporariamente indisponível. Tente novamente em instantes.'
  return erro.message || 'Não foi possível concluir a solicitação.'
}

function telaFalha(titulo, mensagem, voltar) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-600 text-2xl" aria-hidden="true">⚠</div>
        <h1 className="text-xl sm:text-2xl font-bold text-navy mb-2">{titulo}</h1>
        <p className="text-sm text-slate-600 mb-6">{mensagem}</p>
        <Button variant="primary" onClick={voltar} className="w-full">Voltar para Minhas Obras</Button>
      </div>
    </div>
  )
}

function formatarEventoPersistido(evento) {
  const instante = evento.criadoEm ? new Date(evento.criadoEm) : null
  return {
    id: evento.id,
    data: instante ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(instante) : '',
    hora: instante ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(instante) : '',
    autor: evento.usuario?.nome,
    tipo: String(evento.tipo || '').toLowerCase(),
    descricao: evento.descricao,
    fotoUrl: evento.fotoUrl,
  }
}

export default function ColaboradorObra() {
  const { id } = useParams()
  return <DetalhesObra key={id} id={id} />
}

function DetalhesObra({ id }) {
  const navigate = useNavigate()
  const [obra, setObra] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erroCarregamento, setErroCarregamento] = useState(null)
  const [tipoRegistro, setTipoRegistro] = useState('ATUALIZACAO')
  const [textoDescricao, setTextoDescricao] = useState('')
  const [fotoSelecionada, setFotoSelecionada] = useState(null)
  const [erroFormulario, setErroFormulario] = useState('')
  const [erroAtualizacao, setErroAtualizacao] = useState('')
  const [mensagemSucesso, setMensagemSucesso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const envioAtivo = useRef(false)
  const geracaoRequisicao = useRef(0)

  useEffect(() => {
    const geracao = ++geracaoRequisicao.current
    let ativo = true
    buscarObra(id)
      .then((dados) => {
        if (!ativo) return
        setObra(dados)
      })
      .catch((erro) => {
        if (ativo) setErroCarregamento(erro)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
      if (geracaoRequisicao.current === geracao) geracaoRequisicao.current += 1
    }
  }, [id])

  async function handleRegistrarAndamento(event) {
    event.preventDefault()
    const descricao = textoDescricao.trim()
    if (!descricao) {
      setErroFormulario('Informe a descrição do andamento.')
      return
    }
    if (descricao.length > 2000) {
      setErroFormulario('A descrição deve ter no máximo 2.000 caracteres.')
      return
    }
    if (fotoSelecionada && (!['image/jpeg', 'image/png', 'image/webp'].includes(fotoSelecionada.type) || fotoSelecionada.size > 5 * 1024 * 1024)) {
      setErroFormulario('Escolha uma foto JPG, PNG ou WebP de até 5 MB.')
      return
    }
    if (envioAtivo.current) return

    envioAtivo.current = true
    setEnviando(true)
    setErroFormulario('')
    setErroAtualizacao('')
    setMensagemSucesso('')
    const geracao = geracaoRequisicao.current
    try {
      const foto = fotoSelecionada ? await new Promise((resolve, reject) => {
        const leitor = new FileReader()
        leitor.onload = () => resolve({ data: leitor.result, mimeType: fotoSelecionada.type })
        leitor.onerror = () => reject(new Error('Não foi possível ler a foto selecionada.'))
        leitor.readAsDataURL(fotoSelecionada)
      }) : undefined
      const resposta = await registrarAndamentoObra(id, descricao, tipoRegistro, foto)
      if (geracaoRequisicao.current !== geracao) return

      // O evento retornado pelo servidor é persistido; serve de fallback se a recarga falhar.
      const eventoPersistido = resposta.evento ? formatarEventoPersistido(resposta.evento) : null
      setTextoDescricao('')
      setTipoRegistro('ATUALIZACAO')
      setFotoSelecionada(null)
      setMensagemSucesso('Andamento registrado com sucesso.')
      if (eventoPersistido) {
        setObra((atual) => atual ? { ...atual, timeline: [...(atual.timeline || []).filter((evento) => evento.id !== eventoPersistido.id), eventoPersistido] } : atual)
      }

      try {
        const atualizada = await buscarObra(id)
        if (geracaoRequisicao.current === geracao) setObra(atualizada)
      } catch (erro) {
        if (geracaoRequisicao.current === geracao) {
          setErroAtualizacao(`O registro foi salvo, mas o histórico não pôde ser recarregado. ${mensagemFalha(erro)}`)
        }
      }
    } catch (erro) {
      if (geracaoRequisicao.current === geracao) setErroFormulario(mensagemFalha(erro))
    } finally {
      envioAtivo.current = false
      if (geracaoRequisicao.current === geracao) setEnviando(false)
    }
  }

  if (carregando) {
    return <div className="min-h-screen bg-background p-6 text-center text-sm text-slate-600" role="status">Carregando dados da obra…</div>
  }

  if (erroCarregamento) {
    const status = erroCarregamento.status
    const titulo = status === 404 ? 'Obra não encontrada' : status === 403 ? 'Acesso não autorizado' : status === 401 ? 'Sessão não autorizada' : 'Não foi possível carregar a obra'
    return telaFalha(titulo, mensagemFalha(erroCarregamento), () => navigate('/colaborador'))
  }

  if (!obra) return telaFalha('Obra não encontrada', 'A API não retornou os dados desta obra.', () => navigate('/colaborador'))
  const cores = coresStatus(obra.status)

  return (
    <div className="min-h-screen bg-background text-ink">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => navigate('/colaborador')} className="text-xs py-1.5 px-3">← Voltar</Button>
          <nav className="text-xs text-slate-500 hidden sm:flex items-center gap-2" aria-label="Navegação estrutural">
            <Link to="/colaborador" className="hover:text-emerald-700">Minhas Obras</Link><span>/</span>
            <span className="font-semibold text-navy truncate max-w-[200px]">{obra.titulo}</span><span>/</span>
            <span className="text-emerald-700 font-semibold">Registrar Andamento</span>
          </nav>
          <span className="text-xs text-slate-500">Acesso autorizado pela API</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs" aria-label="Dados da obra">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Obra em Execução · Canteiro de Obras</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cores.fundo} ${cores.texto}`}>
              <span className={`w-2 h-2 rounded-full ${cores.ponto}`} aria-hidden="true" />{obra.status}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy mb-2">{obra.titulo}</h1>
          <p className="flex items-start gap-2 text-sm text-slate-600 mb-2"><span aria-hidden="true">📍</span>{obra.endereco || 'Endereço não informado'}</p>
          <p className="flex items-center gap-2 text-xs text-slate-500"><span aria-hidden="true">📅</span>Previsão de entrega: <strong className="text-slate-700">{obra.prazo || 'Não informado'}</strong></p>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"><h2 className="font-bold text-navy">O que será executado</h2><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{obra.informacoesAdicionais || obra.descricao || 'A empreiteira ainda não registrou os serviços, materiais e medidas desta obra.'}</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"><h2 className="font-bold text-navy">Gerentes e responsáveis alocados</h2>{(obra.colaboradores || []).length ? <ul className="mt-3 space-y-2">{obra.colaboradores.map((pessoa) => <li key={pessoa.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm"><strong className="text-navy">{pessoa.nome}</strong><span className="text-slate-600"> · {pessoa.funcao || 'Responsável'}</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Nenhum responsável ativo foi informado.</p>}</article>
        </section>

        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"><summary className="cursor-pointer font-bold text-navy">Funcionários programados nesta obra ({obra.funcionariosProgramados?.length || 0})</summary>{obra.funcionariosProgramados?.length ? <ul className="mt-4 grid gap-3 sm:grid-cols-2">{obra.funcionariosProgramados.map((pessoa) => <li key={pessoa.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">{pessoa.fotoUrl && <img src={pessoa.fotoUrl} alt={`Foto de ${pessoa.nome}`} className="h-12 w-12 rounded-full object-cover" />}<div><strong className="text-sm text-navy">{pessoa.nome}</strong><p className="text-xs text-slate-600">{pessoa.funcao} · Dias: {pessoa.diasSemana.map((dia) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dia]).join(', ')}</p></div></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">A empreiteira ainda não registrou funcionários nesta escala.</p>}</details>

        {(obra.fotos || []).length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"><h2 className="font-bold text-navy">Fotos e referências do canteiro</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{obra.fotos.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Referência da obra ${obra.titulo}`} loading="lazy" className="h-52 w-full rounded-lg object-cover" /></a>)}</div></section>}

        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs" aria-label="Formulário de andamento">
          <div className="mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-navy">Registrar Andamento no Canteiro</h2>
            <p className="mt-1 text-xs text-slate-500">Registre progresso físico, ocorrências ou anotações técnicas. O registro será salvo no servidor.</p>
          </div>
          {mensagemSucesso && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800" role="status">✓ {mensagemSucesso}</p>}
          {erroAtualizacao && <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800" role="alert">{erroAtualizacao}</p>}
          {erroFormulario && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">{erroFormulario}</p>}

          <form onSubmit={handleRegistrarAndamento} noValidate className="space-y-4">
            <div>
              <label htmlFor="tipo-registro" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tipo de Registro</label>
              <select id="tipo-registro" value={tipoRegistro} onChange={(event) => setTipoRegistro(event.target.value)} className="w-full sm:w-72 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800">
                {tiposRegistro.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.rotulo}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="descricao-registro" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Descrição do Andamento <span className="text-red-500">*</span></label>
              <textarea id="descricao-registro" rows={4} maxLength={2000} value={textoDescricao} onChange={(event) => { setTextoDescricao(event.target.value); setErroFormulario('') }} placeholder="Descreva o serviço executado ou a ocorrência…" className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-800" />
              <p className="mt-1 text-right text-[11px] text-slate-400">{textoDescricao.length}/2.000</p>
            </div>
            <div>
              <label htmlFor="foto-registro" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Foto da obra (opcional)</label>
              <input id="foto-registro" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { setFotoSelecionada(event.target.files?.[0] || null); setErroFormulario('') }} className="block w-full text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-emerald-800" />
              <p className="mt-1 text-[11px] text-slate-500">JPG, PNG ou WebP, até 5 MB. O arquivo é enviado ao armazenamento seguro.</p>
            </div>
            <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
              <Button variant="compact" type="submit" disabled={enviando} className="bg-emerald-700 hover:bg-emerald-800 text-xs py-2 px-4">
                {enviando ? 'Registrando…' : 'Registrar Andamento'}
              </Button>
              <Button variant="outline" type="button" onClick={() => navigate('/colaborador')} className="text-xs py-1.5 px-3">Voltar para Minhas Obras</Button>
            </div>
          </form>
        </section>

        <HistoricoObra eventos={obra.timeline || []} perfil="COLABORADOR" />
      </main>
    </div>
  )
}
