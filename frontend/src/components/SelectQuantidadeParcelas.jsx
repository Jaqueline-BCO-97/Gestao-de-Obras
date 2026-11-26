// Importa os hooks necessários para controlar foco, abertura e cliques fora do seletor.
import { useEffect, useRef, useState } from 'react'
// Importa as opções e as regras de teclado compartilhadas com os testes.
import { criarOpcoesQuantidadeParcelas, localizarIndiceQuantidadeParcelas, resolverTeclaQuantidadeParcelas } from '../utils/quantidadeParcelas.js'

// Exibe a quantidade de parcelas em uma lista curta e acessível por teclado ou toque.
export default function SelectQuantidadeParcelas({ id, value, onChange, disabled = false, disabledReason = '' }) {
  // Guarda a raiz do seletor para detectar quando o usuário clica fora dele.
  const raizRef = useRef(null)
  // Cria a lista completa com as mesmas 36 quantidades do formulário anterior.
  const opcoes = criarOpcoesQuantidadeParcelas()
  // Controla se a lista suspensa está visível.
  const [aberta, setAberta] = useState(false)
  // Controla qual opção está ativa durante a navegação pelo teclado.
  const [indiceAtivo, setIndiceAtivo] = useState(-1)
  // Localiza a posição da quantidade atualmente escolhida.
  const indiceSelecionado = localizarIndiceQuantidadeParcelas(value, opcoes)
  // Monta o estado atual no formato usado pelo redutor de teclado.
  const estadoTeclado = { aberta, indiceAtivo }

  // Fecha a lista quando o usuário toca ou clica em qualquer lugar fora do seletor.
  useEffect(() => {
    // Não instala um listener global enquanto a lista está fechada.
    if (!aberta) return undefined
    // Fecha a lista ao detectar um ponteiro fora da caixa do componente.
    function fecharAoClicarFora(evento) {
      // Preserva a lista aberta quando o clique ocorre dentro do seletor.
      if (!raizRef.current?.contains(evento.target)) setAberta(false)
    }
    // Usa pointerdown para cobrir mouse, caneta e toque em dispositivos móveis.
    document.addEventListener('pointerdown', fecharAoClicarFora)
    // Remove o listener quando a lista fecha ou o componente sai da tela.
    return () => document.removeEventListener('pointerdown', fecharAoClicarFora)
  }, [aberta])

  // Mantém a opção ativa visível durante a navegação por teclado.
  useEffect(() => {
    // Não tenta rolar a lista enquanto ela estiver fechada.
    if (!aberta || indiceAtivo < 0) return
    // Localiza a opção ativa pelo identificador estável do componente.
    const opcaoAtiva = document.getElementById(id + '-opcao-' + indiceAtivo)
    // Rola apenas o suficiente para revelar a opção ativa dentro da lista.
    opcaoAtiva?.scrollIntoView?.({ block: 'nearest' })
  }, [aberta, id, indiceAtivo])

  // Atualiza a navegação de teclado e confirma opções sem mover o foco do botão.
  function lidarComTecla(evento) {
    // Calcula a posição que deve ficar ativa para a tecla recebida.
    const proximoEstado = resolverTeclaQuantidadeParcelas(evento.key, estadoTeclado, opcoes.length, indiceSelecionado, disabled)
    // Deixa teclas sem regra seguir o comportamento normal do navegador.
    if (!proximoEstado) return
    // Evita que setas e Enter rolem a página ou enviem o formulário.
    evento.preventDefault()
    // Atualiza a visibilidade da lista conforme a tecla selecionada.
    setAberta(proximoEstado.aberta)
    // Atualiza a opção destacada para a próxima ação do teclado.
    setIndiceAtivo(proximoEstado.indiceAtivo)
    // Confirma a opção somente quando o redutor retorna um índice válido.
    if (proximoEstado.confirmar !== null) onChange(opcoes[proximoEstado.confirmar].valor)
  }

  // Seleciona uma opção clicada ou tocada e fecha a lista suspensa.
  function selecionar(indice) {
    // Ignora o evento caso o controle tenha sido bloqueado enquanto a lista estava visível.
    if (disabled) return
    // Atualiza o valor controlado pelo formulário pai.
    onChange(opcoes[indice].valor)
    // Guarda a opção escolhida para que a próxima abertura comece nesse ponto.
    setIndiceAtivo(indice)
    // Fecha a lista após a seleção por toque ou clique.
    setAberta(false)
  }

  // Mostra o texto da quantidade escolhida ou a instrução inicial do formulário.
  const textoSelecionado = indiceSelecionado >= 0 ? opcoes[indiceSelecionado].texto : 'Selecione…'

  // Devolve o controle com cinco opções visíveis por vez e todas as opções roláveis.
  return (
    // Agrupa o botão e a lista para tratar cliques externos.
    <div ref={raizRef} className="relative mt-1">
      {/* Apresenta o valor atual e recebe a navegação por teclado. */}
      <button
        id={id}
        type="button"
        role="combobox"
        aria-label="Quantidade de parcelas"
        aria-haspopup="listbox"
        aria-expanded={aberta && !disabled}
        aria-controls={id + '-lista'}
        aria-required="true"
        aria-disabled={disabled}
        aria-describedby={disabled && disabledReason ? id + '-ajuda' : undefined}
        aria-activedescendant={aberta && !disabled && indiceAtivo >= 0 ? id + '-opcao-' + indiceAtivo : undefined}
        onClick={() => {
          // Mantém a lista fechada caso o evento seja acionado em um campo bloqueado.
          if (disabled) return
          // Alterna a lista e posiciona o destaque na opção selecionada ou na primeira.
          setIndiceAtivo(indiceSelecionado >= 0 ? indiceSelecionado : 0)
          // Abre a lista ao clicar no botão recolhido.
          setAberta((atual) => !atual)
        }}
        onKeyDown={lidarComTecla}
        onBlur={() => setAberta(false)}
        disabled={disabled}
        className="flex min-h-10 w-full items-center justify-between rounded border border-slate-300 bg-white p-2 text-left text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
      >
        {/* Repete a opção escolhida ou o texto inicial sem abrir a lista. */}
        <span>{textoSelecionado}</span>
        {/* Indica visualmente se a lista está aberta ou fechada. */}
        <span aria-hidden="true">{aberta ? '▴' : '▾'}</span>
      </button>
      {/* Explica o motivo do bloqueio junto ao campo desabilitado. */}
      {disabled && disabledReason && <p id={id + '-ajuda'} className="mt-1 text-xs text-slate-500">{disabledReason}</p>}
      {/* Mantém a lista fora da árvore visual enquanto o seletor está recolhido. */}
      {aberta && !disabled && (
        // Limita a janela a cinco linhas e permite rolar todas as opções restantes.
        <ul id={id + '-lista'} role="listbox" aria-labelledby={id} className="absolute z-20 mt-1 max-h-[202px] w-full overflow-auto rounded border border-slate-300 bg-white shadow-lg">
          {/* Mantém todas as 36 opções no mesmo listbox acessível. */}
          {opcoes.map((opcao, indice) => (
            // Apresenta cada opção como um item selecionável por clique, toque ou teclado.
            <li
              id={id + '-opcao-' + indice}
              key={opcao.valor}
              role="option"
              aria-selected={indice === indiceSelecionado}
              onMouseEnter={() => setIndiceAtivo(indice)}
              onClick={() => selecionar(indice)}
              className={'h-10 min-w-max cursor-pointer whitespace-nowrap px-3 py-2 text-sm ' + (indice === indiceAtivo ? 'bg-slate-100' : 'bg-white')}
            >
              {/* Exibe o texto integral preservado para esta quantidade. */}
              {opcao.texto}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
