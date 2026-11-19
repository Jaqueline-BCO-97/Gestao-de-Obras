import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registrarEmpreiteira, salvarSessao } from '../services/auth.js'

const campos = [
  ['empresa', 'Nome da empresa', 'text'],
  ['cnpj', 'CNPJ (14 números)', 'text'],
  ['nome', 'Nome completo do responsável', 'text'],
  ['cpfResponsavel', 'CPF do responsável (11 números)', 'text'],
  ['email', 'E-mail', 'email'],
  ['telefone', 'Telefone principal', 'tel'],
  ['telefoneSecundario', 'Telefone adicional (opcional)', 'tel'],
  ['enderecoResponsavel', 'Endereço residencial do responsável', 'text'],
  ['endereco', 'Endereço da empresa', 'text'],
  ['senha', 'Senha (mínimo 8 caracteres)', 'password'],
]

export default function RegistroEmpreiteira() {
  const [dados, setDados] = useState({ empresa: '', cnpj: '', nome: '', cpfResponsavel: '', email: '', telefone: '', telefoneSecundario: '', enderecoResponsavel: '', endereco: '', senha: '' })
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const navigate = useNavigate()
  function alterar(event) {
    const { name, value } = event.target
    const texto = ['cnpj', 'cpfResponsavel'].includes(name) ? value.replace(/\D/g, '') : value
    setDados({ ...dados, [name]: texto })
  }
  async function enviar(event) {
    event.preventDefault(); setErro(''); setCarregando(true)
    try { const sessao = await registrarEmpreiteira(dados); salvarSessao(sessao, true); navigate('/admin') }
    catch (falha) { setErro(falha.message) }
    finally { setCarregando(false) }
  }
  return <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900"><form onSubmit={enviar} className="mx-auto max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow sm:p-8">
    <Link to="/login" className="text-sm text-sky-700">← Voltar ao login</Link>
    <h1 className="text-2xl font-bold text-[#0c2d43]">Cadastrar Empresa</h1>
    <p className="text-sm text-slate-600">Informe os dados da empresa e do responsável pela conta.</p>
    {erro && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
    <div className="grid gap-3 sm:grid-cols-2">{campos.map(([name, label, type]) => <label key={name} className={`block text-sm font-medium ${['empresa', 'enderecoResponsavel', 'endereco'].includes(name) ? 'sm:col-span-2' : ''}`}>{label}<input required={name !== 'telefoneSecundario'} maxLength={name === 'cnpj' ? 14 : name === 'cpfResponsavel' ? 11 : undefined} minLength={name === 'cnpj' ? 14 : name === 'cpfResponsavel' ? 11 : name === 'senha' ? 8 : undefined} inputMode={['cnpj', 'cpfResponsavel'].includes(name) ? 'numeric' : undefined} type={type} name={name} autoComplete={name === 'senha' ? 'new-password' : undefined} value={dados[name]} onChange={alterar} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>)}</div>
    <button disabled={carregando} className="w-full rounded-lg bg-[#0c2d43] p-3 font-semibold text-white">{carregando ? 'Cadastrando…' : 'Cadastrar empresa'}</button>
  </form></main>
}
