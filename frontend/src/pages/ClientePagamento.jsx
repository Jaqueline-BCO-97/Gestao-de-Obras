// Importa os recursos de rota usados para ler o ID e voltar à página anterior.
import { useNavigate, useParams } from 'react-router-dom'
// Importa o botão compartilhado usado nas ações da página.
import Button from '../components/Button.jsx'
// Importa as obras fictícias usadas pelo protótipo.
import { obrasMock } from '../data/obrasMock.js'

// Apresenta uma página temporária para o pagamento da parcela final.
export default function ClientePagamento() {
  // Lê da URL o identificador da obra selecionada.
  const { id } = useParams()
  // Prepara a navegação de retorno aos detalhes da obra.
  const navigate = useNavigate()
  // Procura no mock a obra solicitada pelo identificador da rota.
  const obra = obrasMock.find((item) => String(item.id) === String(id))

  // Mostra uma mensagem simples caso o identificador não corresponda a uma obra.
  if (!obra) return <main className="min-h-screen p-8 text-center">Obra não encontrada.</main>

  // Renderiza o título, os dados básicos e a ação de retorno.
  return (
    // Mantém o conteúdo centralizado e confortável em telas pequenas ou grandes.
    <main className="min-h-screen bg-background p-6 text-ink">
      {/* Agrupa as informações temporárias em um cartão. */}
      <section className="mx-auto max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Informa que a tela de pagamento ainda está em construção. */}
        <h1 className="text-2xl font-bold text-navy">Pagamento (em construção)</h1>
        {/* Mostra o identificador e o nome da obra selecionada. */}
        <p><strong>Obra:</strong> #{obra.id} — {obra.titulo}</p>
        {/* Mostra o nome cadastrado do cliente. */}
        <p><strong>Cliente:</strong> {obra.cliente}</p>
        {/* Mostra o valor previsto para a segunda parcela. */}
        <p><strong>Pagamento final:</strong> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(obra.parcela2.valor)}</p>
        {/* Leva o cliente de volta aos detalhes da mesma obra. */}
        <Button variant="outline" onClick={() => navigate(`/cliente/obra/${obra.id}`)} icon="←">Voltar para a obra</Button>
      </section>
    </main>
  )
}
