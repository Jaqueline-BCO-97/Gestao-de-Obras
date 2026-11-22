import { useRef, useState } from 'react'
import Button from './Button.jsx'
import Modal from './Modal.jsx'

export default function useConfirmacao() {
  const [pergunta, setPergunta] = useState(null)
  const resolver = useRef(null)

  function pedirConfirmacao(texto) {
    return new Promise((resolve) => {
      resolver.current = resolve
      setPergunta(texto)
    })
  }

  function responder(valor) {
    resolver.current?.(valor)
    resolver.current = null
    setPergunta(null)
  }

  const modal = <Modal open={Boolean(pergunta)} showHeader={false} onClose={() => responder(false)}>
    <p className="text-base font-medium text-ink">{pergunta}</p>
    <div className="mt-5 flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={() => responder(false)}>Cancelar</Button>
      <Button type="button" onClick={() => responder(true)}>Confirmar</Button>
    </div>
  </Modal>

  return { pedirConfirmacao, modal }
}
