import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registrarEmpreiteira, salvarSessao } from '../services/auth.js'

export default function RegistroEmpreiteira() {
  const [dados, setDados] = useState({ empresa: '', nome: '', email: '', senha: '' })
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const navigate = useNavigate()
  function alterar(event) { setDados({ ...dados, [event.target.name]: event.target.value }) }
  async function enviar(event) {
    event.preventDefault(); setErro(''); setCarregando(true)
    try { const sessao = await registrarEmpreiteira(dados); salvarSessao(sessao, true); navigate('/admin') }
    catch (falha) { setErro(falha.message) }
    finally { setCarregando(false) }
  }
  return <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900"><form onSubmit={enviar} className="mx-auto max-w-lg space-y-4 rounded-2xl bg-white p-8 shadow">
    <Link to="/login" className="text-sm text-sky-700">← Voltar ao login</Link>
    <h1 className="text-2xl font-bold text-[#0c2d43]">Cadastrar empreiteira</h1>
    <p className="text-sm text-slate-600">O ObraMaster ajuda sua equipe a gerenciar obras e compartilhar o andamento com seus clientes. Não é um serviço de contratação de empreiteiras ou profissionais.</p>
    {erro && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
    {[['empresa','Nome da empreiteira','text'],['nome','Seu nome','text'],['email','E-mail','email'],['senha','Senha (mínimo 8 caracteres)','password']].map(([name,label,type]) => <label key={name} className="block text-sm font-medium">{label}<input required minLength={name === 'senha' ? 8 : undefined} type={type} name={name} value={dados[name]} onChange={alterar} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>)}
    <button disabled={carregando} className="w-full rounded-lg bg-[#0c2d43] p-3 font-semibold text-white">{carregando ? 'Cadastrando…' : 'Criar conta da empreiteira'}</button>
  </form></main>
}
