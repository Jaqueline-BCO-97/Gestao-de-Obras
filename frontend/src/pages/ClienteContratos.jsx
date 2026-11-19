import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarObras } from '../services/auth.js'

export default function ClienteContratos() {
  const [obras, setObras] = useState([])
  const [erro, setErro] = useState('')
  useEffect(() => { let ativo = true; listarObras().then((lista) => { if (ativo) setObras(lista) }).catch((falha) => { if (ativo) setErro(falha.message) }); return () => { ativo = false } }, [])
  return <main className="mx-auto min-h-screen max-w-5xl space-y-5 bg-background px-4 py-8 text-ink"><Link to="/cliente" className="text-sm font-semibold text-sky-700">← Minhas obras</Link><div><p className="text-xs font-bold uppercase tracking-wider text-primary">Documentos</p><h1 className="mt-1 text-3xl font-bold text-navy">Contratos</h1><p className="mt-1 text-sm text-slate-600">Contratos acordados com a empreiteira para cada obra.</p></div>{erro && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{erro}</p>}{obras.map((obra) => <article key={obra.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-navy">{obra.titulo}</h2>{obra.contrato?.arquivoUrl ? <a href={obra.contrato.arquivoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-sky-700 underline">Abrir contrato em PDF</a> : <p className="mt-2 text-sm text-slate-500">Ainda não há contrato anexado para esta obra.</p>}{obra.contrato?.termos && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{obra.contrato.termos}</p>}</article>)}</main>
}
