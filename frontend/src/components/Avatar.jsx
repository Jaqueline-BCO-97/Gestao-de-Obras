import { useState } from 'react'

function obterIniciais(nome = '') {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  return partes.slice(0, 2).map((parte) => parte[0]).join('').toLocaleUpperCase('pt-BR') || '?'
}

export default function Avatar({ nome, src, className = 'h-10 w-10', fallbackClassName = 'bg-slate-100 text-navy' }) {
  const [imagemIndisponivel, setImagemIndisponivel] = useState('')

  const classes = `grid shrink-0 place-items-center overflow-hidden rounded-full border ${className}`

  if (src && imagemIndisponivel !== src) {
    return <img src={src} alt={`Foto de ${nome || 'perfil'}`} onError={() => setImagemIndisponivel(src)} className={`${classes} object-cover`} />
  }

  return <span role="img" aria-label={`Iniciais de ${nome || 'perfil'}`} className={`${classes} ${fallbackClassName} text-sm font-bold`}>{obterIniciais(nome)}</span>
}
