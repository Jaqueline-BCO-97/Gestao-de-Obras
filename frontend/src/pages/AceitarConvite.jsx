import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { aceitarConvite, consultarConvite, salvarSessao, obterToken } from '../services/auth.js'

export default function AceitarConvite() {
  const { token } = useParams()
  const [convite, setConvite] = useState(null)
  const [erro, setErro] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(true)
  const navigate = useNavigate()
  useEffect(() => { consultarConvite(token).then(setConvite).catch((e) => setErro(e.message)).finally(() => setCarregando(false)) }, [token])
  async function enviar(event) {
    event.preventDefault(); setErro(''); setCarregando(true)
    try { const sessao = await aceitarConvite(token, senha); salvarSessao(sessao, true); navigate(sessao.usuario.tipo === 'CLIENTE' ? '/cliente' : '/colaborador') }
    catch (e) { setErro(e.message) }
    finally { setCarregando(false) }
  }
  return <main className="min-h-screen bg-slate-50 px-4 py-12"><section className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow">
    <Link to="/login" className="text-sm text-sky-700">ObraMaster</Link><h1 className="mt-4 text-2xl font-bold text-[#0c2d43]">Convite para acessar uma obra</h1>
    {carregando && <p role="status" className="mt-4">Carregando convite…</p>}
    {erro && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
    {convite && <><p className="mt-4 text-sm text-slate-700">A empreiteira <strong>{convite.empresa}</strong> convidou <strong>{convite.email}</strong> como {convite.tipo === 'CLIENTE' ? 'cliente para acompanhar' : 'gerente responsável por'} a obra <strong>{convite.obra}</strong>.</p>
    {(convite.expirado || convite.usado) ? <p className="mt-4 text-sm text-red-700">Este convite {convite.usado ? 'já foi utilizado' : 'expirou'}. Peça à empreiteira um novo link.</p> : <form onSubmit={enviar} className="mt-5 space-y-3"><p className="text-xs text-slate-600">Se você já tem uma conta com este e-mail, <Link to="/login" className="text-sky-700 underline">entre primeiro</Link> e volte a este link. Caso contrário, crie sua senha.</p>{!obterToken() && <label className="block text-sm font-medium">Crie sua senha<input required minLength={8} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>}<button disabled={carregando} className="w-full rounded-lg bg-[#0c2d43] p-3 font-semibold text-white">Aceitar convite</button></form>}
    </>}
  </section></main>
}
