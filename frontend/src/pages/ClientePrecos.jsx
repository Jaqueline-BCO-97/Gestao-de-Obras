import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarTabelaPrecosCliente } from '../services/auth.js'

const emReais = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor))

export default function ClientePrecos() {
  const [precos, setPrecos] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    let ativo = true
    listarTabelaPrecosCliente().then((dados) => { if (ativo) setPrecos(dados) }).catch((falha) => { if (ativo) setErro(falha.message) }).finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [])

  return <main className="mx-auto min-h-screen max-w-5xl space-y-5 bg-background px-4 py-8 text-ink">
    <Link to="/cliente" className="text-sm font-semibold text-sky-700">← Minhas obras</Link>
    <div><p className="text-xs font-bold uppercase tracking-wider text-primary">Referência</p><h1 className="mt-1 text-3xl font-bold text-navy">Tabela de preços</h1><p className="mt-1 text-sm text-slate-600">Valores de referência cadastrados pela empreiteira. Esta tela é somente para consulta.</p></div>
    <section className="space-y-3">{erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{erro}</p>}{carregando ? <p role="status">Carregando preços…</p> : precos.length ? <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-navy"><tr><th className="p-4">Serviço</th><th className="p-4">Unidade</th><th className="p-4">Preço</th></tr></thead><tbody>{precos.map((preco) => <tr key={preco.id} className="border-t border-slate-100"><td className="p-4 font-semibold">{preco.servico}</td><td className="p-4">{preco.unidade}</td><td className="p-4">{emReais(preco.valor)} / {preco.unidade}</td></tr>)}</tbody></table></div> : <p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">A empreiteira ainda não publicou preços de referência.</p>}</section>
  </main>
}
