// Importa o hook para controlar a ordem dos eventos exibidos.
import { useState } from 'react'
// Importa o filtro compartilhado e os nomes legíveis dos eventos.
import { filtrarEventosPorPerfil, ROTULOS_EVENTO } from '../data/obrasMock.js'

// Define os rótulos e as cores próprias de cada categoria de evento.
const estilosPorTipo = {
  // Apresenta o início formal da relação de trabalho.
  contratacao: { rotulo: 'Contratação', cor: 'bg-blue-100 text-blue-800' },
  // Apresenta a aprovação do orçamento da obra.
  orcamento_aprovado: { rotulo: 'Orçamento aprovado', cor: 'bg-indigo-100 text-indigo-800' },
  // Apresenta uma visita ou etapa marcada no calendário.
  agendamento: { rotulo: 'Agendamento', cor: 'bg-sky-100 text-sky-800' },
  // Apresenta uma mudança no andamento ou no status da obra.
  status: { rotulo: 'Status', cor: 'bg-amber-100 text-amber-800' },
  // Apresenta um registro relacionado a cobrança ou pagamento.
  pagamento: { rotulo: 'Pagamento', cor: 'bg-emerald-100 text-emerald-800' },
  // Apresenta uma observação geral registrada na obra.
  anotacao: { rotulo: 'Anotação', cor: 'bg-slate-100 text-slate-800' },
  // Apresenta uma atualização de serviço ou etapa.
  atualizacao: { rotulo: 'Atualização', cor: 'bg-violet-100 text-violet-800' },
  // Apresenta uma ocorrência registrada durante o trabalho.
  ocorrencia: { rotulo: 'Ocorrência', cor: 'bg-rose-100 text-rose-800' },
  // Apresenta um registro fotográfico da obra.
  foto: { rotulo: 'Foto', cor: 'bg-fuchsia-100 text-fuchsia-800' },
  // Apresenta uma informação sobre a equipe de trabalho.
  equipe: { rotulo: 'Equipe', cor: 'bg-cyan-100 text-cyan-800' },
}

// Converte uma data no formato brasileiro em um número fácil de comparar.
function converterDataParaOrdem(data = '') {
  // Separa dia, mês e ano para evitar comparações incorretas de texto.
  const [dia = '0', mes = '0', ano = '0'] = data.split('/')
  // Constrói uma sequência numérica no formato ano-mês-dia.
  return Number(`${ano.padStart(4, '0')}${mes.padStart(2, '0')}${dia.padStart(2, '0')}`)
}

// Remove valores monetários das descrições que forem exibidas a colaboradores.
function esconderValoresEmDinheiro(descricao = '') {
  // Troca valores em reais por um texto neutro sem remover o restante da frase.
  return descricao.replace(/R\$\s?\d[\d.,]*/gi, '[valor oculto]')
}

// Exibe o histórico da obra de acordo com o perfil de quem está consultando.
export default function HistoricoObra({ eventos = [], perfil = 'CLIENTE' }) {
  // Guarda se a lista deve começar pelo evento mais antigo.
  const [ordemInvertida, setOrdemInvertida] = useState(false)
  // Prepara apenas os eventos que o perfil atual pode consultar.
  const eventosPermitidos = filtrarEventosPorPerfil(eventos, perfil)
  // Organiza cópia da lista para não modificar os dados recebidos por propriedade.
  const eventosOrdenados = [...eventosPermitidos].sort((primeiro, segundo) => {
    // Compara primeiro a data e depois a hora para obter a cronologia correta.
    const diferenca = converterDataParaOrdem(primeiro.data) - converterDataParaOrdem(segundo.data)
      || (primeiro.hora || '').localeCompare(segundo.hora || '')
    // Inverte o sinal quando a pessoa escolhe ver primeiro os eventos antigos.
    return ordemInvertida ? diferenca : -diferenca
  })

  // Mantém o cartão, o título e o espaçamento da seção original da página.
  return (
    // Caixa visual que agrupa o histórico no mesmo estilo dos demais cartões.
    <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-sm" aria-label="Evolução da obra">
      {/* Cabeçalho com título, explicação e controle para inverter a ordem. */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        {/* Textos que explicam o conteúdo da seção. */}
        <div>
          {/* Nome da seção do histórico. */}
          <h2 className="text-lg font-bold text-navy">Evolução da Obra (Histórico)</h2>
          {/* Explicação breve sobre os registros mostrados. */}
          <p className="text-xs text-slate-500">Histórico de eventos, serviços executados e vistorias registradas.</p>
        </div>
        {/* Botão que alterna entre a ordem recente e a ordem antiga. */}
        <button type="button" onClick={() => setOrdemInvertida((valorAtual) => !valorAtual)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" aria-label="Inverter ordem do histórico">
          {/* Atualiza o texto para informar a próxima ordem disponível. */}
          {ordemInvertida ? 'Mais recentes primeiro' : 'Mais antigos primeiro'}
        </button>
      </div>
      {/* Mostra uma orientação acolhedora quando nenhum evento está disponível. */}
      {eventosOrdenados.length === 0 ? (
        // Área vazia com mensagem clara para a pessoa usuária.
        <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Ainda não há eventos disponíveis no histórico desta obra.</p>
      ) : (
        // Lista vertical com um cartão para cada evento permitido.
        <div className="relative ml-3 space-y-6 border-l-2 border-slate-200 pl-6 sm:ml-4 sm:pl-8">
          {/* Percorre os eventos já filtrados e ordenados. */}
          {eventosOrdenados.map((evento) => {
            // Usa uma aparência neutra se aparecer um tipo ainda não cadastrado.
            const estilo = { rotulo: ROTULOS_EVENTO[evento.tipo] || evento.tipo || 'Evento', cor: estilosPorTipo[evento.tipo]?.cor || 'bg-slate-100 text-slate-800' }
            // Define a descrição segura para o perfil de colaborador.
            const descricao = perfil === 'COLABORADOR' ? esconderValoresEmDinheiro(evento.descricao) : evento.descricao
            // Desenha o evento individual e seus dados principais.
            return (
              // Mantém o marcador alinhado à linha do tempo vertical.
              <article key={evento.id} className="relative group">
                {/* Marcador colorido que identifica a posição do evento. */}
                <span className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-primary shadow-sm sm:-left-[39px]" aria-hidden="true" />
                {/* Cartão com tipo, data, autor e descrição do registro. */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm">
                  {/* Linha de metadados do evento. */}
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    {/* Etiqueta com rótulo e cor correspondentes ao tipo. */}
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${estilo.cor}`}>{estilo.rotulo}</span>
                    {/* Data e hora em que o evento aconteceu. */}
                    <time className="text-xs font-medium text-slate-500">{evento.data} às {evento.hora || 'horário não informado'}</time>
                  </div>
                  {/* Identificação de quem registrou o evento. */}
                  <p className="mb-1 text-xs font-semibold text-slate-500">Registrado por: {evento.autor || 'Responsável não informado'}</p>
                  {/* Texto que explica o que aconteceu na obra. */}
                  <p className="text-xs leading-relaxed text-slate-700 sm:text-sm">{descricao}</p>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
