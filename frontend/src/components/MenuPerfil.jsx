// Importa o hook useState do React para controlar o estado do menu recolhido.
import { useState } from 'react'
// Importa Link, useLocation e useNavigate do React Router para navegação entre rotas.
import { Link, useLocation, useNavigate } from 'react-router-dom'
// Importa o componente reutilizável de foto/iniciais do usuário.
import Avatar from './Avatar.jsx'
// Importa a função que limpa o token e dados da sessão ao clicar em Sair.
import { encerrarSessao } from '../services/auth.js'
// Importa os utilitários que obtêm a foto e os dados do usuário salvo na sessão.
import { obterFotoPerfil, obterUsuarioDaSessao } from '../utils/fotoPerfil.js'
// Importa os helpers puros de rotas, links ativos e breakpoints do menu.
import {
  linkEstaAtivo,
  obterClassesBreakpointMenu,
  obterLinksMenu,
  obterRotaInicioMenu,
} from '../utils/menuPerfil.js'

// Subcomponente interno reutilizado no desktop, no menu compacto e no menu aberto.
function AtalhoFotoPerfil({ usuario, fotoPerfil, aoClicar, tamanhoClasse = 'h-11 w-11' }) {
  // Retorna o link clicável envolvendo a foto maior e a palavra "Perfil" logo abaixo.
  return (
    <Link
      to="/perfil"
      onClick={aoClicar}
      aria-label="Abrir perfil"
      className="flex shrink-0 flex-col items-center gap-0.5 rounded-md px-2 py-1 text-slate-700 transition hover:bg-slate-100 hover:text-navy"
    >
      {/* Exibe a foto do usuário (ou suas iniciais) em tamanho maior */}
      <Avatar
        nome={usuario?.nome}
        src={fotoPerfil}
        className={`${tamanhoClasse} border-slate-200`}
        fallbackClassName="bg-sky-50 text-navy"
      />
      {/* Exibe o rótulo "Perfil" abaixo da foto em todos os modos de exibição */}
      <span className="text-xs font-semibold leading-none">Perfil</span>
    </Link>
  )
}

// Componente de barra de navegação superior exibido nas páginas autenticadas.
export default function MenuPerfil() {
  // Lê a rota atual para destacar o item correspondente.
  const location = useLocation()
  // Permite redirecionar para /login ao encerrar a sessão.
  const navigate = useNavigate()
  // Guarda em qual rota o menu mobile/tablet foi aberto; ao mudar de página ele fecha sozinho.
  const [caminhoMenuAberto, setCaminhoMenuAberto] = useState(null)
  // Lê os dados do usuário autenticado salvos no navegador.
  const usuario = obterUsuarioDaSessao()
  // Descobre o tipo de perfil (ADMIN, CLIENTE ou COLABORADOR).
  const tipoPerfil = usuario?.tipo
  // Calcula o caminho inicial do painel correspondente ao perfil logado.
  const rotaInicio = obterRotaInicioMenu(tipoPerfil)
  // Monta a lista de links permitidos (já sem "Perfil" e com "Gestão de Obras" para gerente).
  const links = obterLinksMenu(tipoPerfil, location.pathname)
  // Seleciona os breakpoints estáticos conforme a quantidade de itens do perfil.
  const classesBreakpoint = obterClassesBreakpointMenu(tipoPerfil)
  // Resolve a URL da foto do usuário ou vazio para exibir as iniciais no Avatar.
  const fotoPerfil = obterFotoPerfil(usuario)
  // Considera o menu recolhido aberto apenas enquanto estiver na mesma rota em que foi aberto.
  const menuAberto = caminhoMenuAberto === location.pathname

  // Fecha o menu recolhido manualmente (ex.: ao clicar em um link para a rota atual).
  function fecharMenu() {
    // Limpa a rota registrada para recolher o painel.
    setCaminhoMenuAberto(null)
  }

  // Alterna a abertura e fechamento do menu recolhido em telas menores.
  function alternarMenu() {
    // Se já estava aberto nesta rota, fecha; caso contrário, abre nesta rota.
    setCaminhoMenuAberto((atual) => (atual === location.pathname ? null : location.pathname))
  }

  // Encerra a sessão do usuário e redireciona para a tela de login.
  function handleSair() {
    // Fecha o menu recolhido antes de sair.
    fecharMenu()
    // Remove token e usuário armazenados no navegador.
    encerrarSessao()
    // Navega para a rota de autenticação.
    navigate('/login')
  }

  // Renderiza o cabeçalho fixo no topo da página.
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      {/* Container principal mais alto e espaçoso, mantendo logo à esquerda e Sair à direita */}
      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Logo menor posicionada no canto esquerdo levando ao início do perfil logado */}
        <Link
          to={rotaInicio}
          onClick={fecharMenu}
          className="shrink-0 text-sm font-bold text-navy"
          aria-label="ObraMaster início"
        >
          Obra<span className="text-primary">Master</span>
        </Link>

        {/* Navegação horizontal em desktop: itens distribuídos uniformemente sem espremer */}
        <nav
          className={`${classesBreakpoint.barraDesktop} min-w-0 flex-1 items-center justify-evenly gap-1 px-2`}
          aria-label="Menu principal"
        >
          {/* Percorre os links do perfil sem o item textual Perfil */}
          {links.map((item) => {
            // Desestrutura o caminho e o rótulo do item atual.
            const [to, label] = item
            // Verifica se o link corresponde à página ativa no momento.
            const ativo = linkEstaAtivo(item, location.pathname)
            // Renderiza o link com fonte maior e largura preservada sem quebrar linha.
            return (
              <Link
                key={`${to}-${label}`}
                to={to}
                aria-current={ativo ? 'page' : undefined}
                className={`whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-semibold transition ${
                  ativo
                    ? 'bg-navy text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-navy'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bloco direito no desktop: foto clicável maior com "Perfil" e botão Sair no canto direito */}
        <div className={`${classesBreakpoint.barraDesktop} shrink-0 items-center gap-3`}>
          {/* Foto clicável que abre a tela /perfil */}
          <AtalhoFotoPerfil usuario={usuario} fotoPerfil={fotoPerfil} aoClicar={fecharMenu} />
          {/* Botão Sair alinhado no canto direito */}
          <button
            type="button"
            onClick={handleSair}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Sair
          </button>
        </div>

        {/* Barra compacta (abaixo do breakpoint): foto + "Perfil", botão de menu e Sair à direita */}
        <div className={`${classesBreakpoint.controlesRecolhidos} shrink-0 items-center gap-2.5`}>
          {/* Foto clicável visível também no cabeçalho compacto */}
          <AtalhoFotoPerfil usuario={usuario} fotoPerfil={fotoPerfil} aoClicar={fecharMenu} />
          {/* Botão para abrir ou fechar os itens de navegação no modo recolhido */}
          <button
            type="button"
            onClick={alternarMenu}
            aria-expanded={menuAberto}
            aria-controls="menu-recolhido-navegacao"
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {menuAberto ? 'Fechar' : 'Menu'}
          </button>
          {/* Botão Sair mantido no canto direito também na versão compacta */}
          <button
            type="button"
            onClick={handleSair}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Painel aberto em mobile/tablet quando o usuário expande o menu recolhido */}
      {menuAberto && (
        <div
          id="menu-recolhido-navegacao"
          className={`${classesBreakpoint.painelRecolhido} border-t border-slate-200 bg-white px-4 py-4 sm:px-6`}
        >
          {/* Lista de rotas do perfil no menu aberto (sem item textual "Perfil") */}
          <nav className="grid gap-1.5 sm:grid-cols-2" aria-label="Menu recolhido">
            {/* Renderiza cada link com espaçamento confortável para toque */}
            {links.map((item) => {
              // Extrai caminho e rótulo do item atual.
              const [to, label] = item
              // Verifica destaque ativo para a rota corrente.
              const ativo = linkEstaAtivo(item, location.pathname)
              // Ao clicar em um item, fecha o painel recolhido e navega.
              return (
                <Link
                  key={`${to}-${label}`}
                  to={to}
                  onClick={fecharMenu}
                  aria-current={ativo ? 'page' : undefined}
                  className={`rounded-md px-3 py-2.5 text-sm font-semibold transition ${
                    ativo
                      ? 'bg-navy text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-navy'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Rodapé do menu aberto exibindo a foto clicável maior com "Perfil" embaixo e Sair */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            {/* Foto maior clicável com a palavra "Perfil" abaixo no menu aberto */}
            <AtalhoFotoPerfil
              usuario={usuario}
              fotoPerfil={fotoPerfil}
              aoClicar={fecharMenu}
              tamanhoClasse="h-12 w-12"
            />
            {/* Botão Sair alinhado à direita dentro do menu aberto */}
            <button
              type="button"
              onClick={handleSair}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
