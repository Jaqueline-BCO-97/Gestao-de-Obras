// Importa os hooks usados para controlar foco, lista e referências do seletor.
import { useEffect, useRef, useState } from 'react'
// Reutiliza o controle de mouse e toque sem criar dependências novas.
import { criarInteracaoOpcaoCombobox, resolverTeclaComboboxAtribuicao } from '../utils/comboboxAtribuicao.js'

// Busca e seleciona uma obra elegível em um único campo acessível.
export default function ComboboxObraAtribuicao({ id, obras, busca, obraSelecionadaId, mensagemVazia, aoBuscar, aoSelecionar }) {
  // Detecta quando um ponteiro é pressionado fora do campo e da lista.
  const raizRef = useRef(null)
  // Cria os manipuladores de interação uma vez para preservar seus marcadores.
  const [interacao] = useState(() => criarInteracaoOpcaoCombobox())
  // Guarda se a lista de opções está visível.
  const [aberta, setAberta] = useState(false)
  // Guarda a opção destacada na navegação por teclado.
  const [indiceAtivo, setIndiceAtivo] = useState(-1)
  // Localiza a posição da obra atualmente escolhida entre os resultados.
  const indiceSelecionado = obras.findIndex((obra) => obra.id === obraSelecionadaId)

  // Fecha a lista quando o usuário pressiona o ponteiro fora do seletor.
  useEffect(() => {
    // Não registra eventos globais enquanto a lista estiver fechada.
    if (!aberta) return undefined
    // Fecha a lista somente quando o evento ocorrer fora da raiz do combobox.
    function fecharAoClicarFora(evento) {
      // Preserva a lista enquanto o usuário interage com o campo ou uma opção.
      if (raizRef.current?.contains(evento.target)) return
      // Descarta qualquer interação por mouse ou toque interrompida.
      interacao.limparInteracao()
      // Fecha a lista depois do clique externo.
      setAberta(false)
    }
    // Usa pointerdown para cobrir mouse, caneta e toque fora do seletor.
    document.addEventListener('pointerdown', fecharAoClicarFora)
    // Remove o listener ao fechar a lista ou desmontar o componente.
    return () => document.removeEventListener('pointerdown', fecharAoClicarFora)
  }, [aberta, interacao])

  // Mantém a opção ativa visível enquanto o usuário navega com as setas.
  useEffect(() => {
    // Não rola a lista se estiver fechada ou sem opção destacada.
    if (!aberta || indiceAtivo < 0) return
    // Localiza a opção pelo identificador estável do combobox.
    const opcaoAtiva = document.getElementById(id + '-opcao-' + indiceAtivo)
    // Rola somente o necessário para mostrar a opção ativa.
    opcaoAtiva?.scrollIntoView?.({ block: 'nearest' })
  }, [aberta, id, indiceAtivo])

  // Abre a lista e posiciona o destaque na obra escolhida, se houver.
  function abrirLista() {
    // Mantém a opção escolhida ativa ao abrir novamente o combobox.
    setIndiceAtivo(indiceSelecionado)
    // Exibe as obras elegíveis ao focar ou clicar no campo.
    setAberta(true)
  }

  // Seleciona a obra e fecha a lista suspensa.
  function selecionarObra(indice) {
    // Lê a opção correspondente ao índice ativo da lista filtrada.
    const obra = obras[indice]
    // Ignora qualquer índice que não corresponda a uma obra disponível.
    if (!obra) return
    // Atualiza a obra escolhida no estado controlado pela tela pai.
    aoSelecionar(obra)
    // Mantém o índice selecionado para reabrir a lista com o destaque correto.
    setIndiceAtivo(indice)
    // Fecha a lista depois da escolha.
    setAberta(false)
  }

  // Trata as setas, Enter e Escape sem deixar o navegador enviar o formulário.
  function lidarComTecla(evento) {
    // Pede a transição de teclado usando os índices atualmente visíveis.
    const proximoEstado = resolverTeclaComboboxAtribuicao(evento.key, { aberta, indiceAtivo, indiceSelecionado }, obras.length)
    // Deixa as teclas sem regra manter o comportamento normal do navegador.
    if (!proximoEstado) return
    // Evita rolagem da página e envio involuntário do formulário.
    if (proximoEstado.prevenirPadrao || evento.key === 'ArrowDown' || evento.key === 'ArrowUp') evento.preventDefault()
    // Atualiza o estado aberto ou fechado conforme a tecla recebida.
    setAberta(proximoEstado.aberta)
    // Atualiza a opção destacada para a navegação seguinte.
    setIndiceAtivo(proximoEstado.indiceAtivo)
    // Seleciona a obra ativa quando Enter confirma uma opção real.
    if (proximoEstado.confirmar !== null && proximoEstado.confirmar !== undefined) selecionarObra(proximoEstado.confirmar)
  }

  // Mantém a lista aberta se o foco sair por uma opção em mouse ou toque.
  function fecharAoPerderFoco(evento) {
    // Aguarda o evento de opção concluir quando mouse ou toque está em andamento.
    if (interacao.manterListaNoBlur()) return
    // Mantém a lista se o novo foco continuar dentro da raiz do combobox.
    if (raizRef.current?.contains(evento.relatedTarget)) return
    // Fecha a lista quando o foco sair para outro controle.
    setAberta(false)
  }

  // Devolve o campo e o painel acessíveis usados na atribuição.
  return (
    // Agrupa o campo e a lista para detectar foco e cliques externos.
    <div ref={raizRef} className="relative">
      {/* Apresenta o rótulo do único campo de busca e seleção. */}
      <label htmlFor={id} className="block text-xs font-medium">Buscar obra</label>
      {/* Mantém busca e escolha no mesmo campo de texto. */}
      <input
        id={id}
        type="text"
        role="combobox"
        aria-label="Buscar e escolher obra"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={aberta}
        aria-controls={id + '-lista'}
        aria-activedescendant={aberta && indiceAtivo >= 0 ? id + '-opcao-' + indiceAtivo : undefined}
        autoComplete="off"
        value={busca}
        placeholder="Digite para filtrar as obras"
        onFocus={abrirLista}
        onClick={abrirLista}
        onBlur={fecharAoPerderFoco}
        onKeyDown={lidarComTecla}
        onChange={(evento) => {
          // Guarda o texto novo e deixa a tela pai limpar a seleção anterior.
          aoBuscar(evento.target.value)
          // Reinicia o destaque para que a navegação comece pelos resultados novos.
          setIndiceAtivo(-1)
          // Mantém os resultados visíveis enquanto o usuário digita.
          setAberta(true)
        }}
        className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"
      />
      {/* Apresenta opções e mensagens dentro da lista suspensa do combobox. */}
      {aberta && (
        // Limita a lista a cinco opções visíveis e permite rolar as demais.
        <ul id={id + '-lista'} role="listbox" aria-label="Obras disponíveis para atribuir" className="absolute z-20 mt-1 max-h-[200px] w-full overflow-y-auto rounded border border-slate-300 bg-white shadow-lg">
          {/* Mostra uma mensagem acessível quando não há obras correspondentes. */}
          {obras.length === 0 && <li role="option" aria-disabled="true" aria-selected="false" className="px-3 py-2 text-sm text-slate-500">{mensagemVazia}</li>}
          {/* Renderiza cada obra elegível com nome e status. */}
          {obras.map((obra, indice) => (
            // Apresenta uma opção que pode ser escolhida por teclado, clique ou toque.
            <li
              id={id + '-opcao-' + indice}
              key={obra.id}
              role="option"
              aria-selected={obra.id === obraSelecionadaId}
              onMouseEnter={() => setIndiceAtivo(indice)}
              onMouseDown={interacao.iniciarMouse}
              onMouseUp={interacao.finalizarMouse}
              onTouchStart={(evento) => interacao.iniciarToque(evento, evento.currentTarget.parentElement)}
              onTouchMove={interacao.moverToque}
              onTouchEnd={() => interacao.finalizarToque(indice, selecionarObra)}
              onTouchCancel={interacao.limparInteracao}
              onClick={() => interacao.selecionarPorClique(indice, selecionarObra)}
              className={'min-h-10 cursor-pointer px-3 py-2 text-sm ' + (indice === indiceAtivo ? 'bg-slate-100' : 'bg-white')}
            >
              {/* Exibe o nome da obra e o status que ajuda a distinguir opções. */}
              {obra.titulo || obra.nome} · {obra.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
