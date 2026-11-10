// Componente reutilizável de Card para dashboards e painéis de dados
// Pode ser usado tanto para exibir métricas (label + value + icon) quanto para empacotar conteúdos variados via children
export default function Card({
  // Título pequeno exibido na parte superior do card de métrica
  label,
  // Valor numérico ou texto em destaque exibido no card de métrica
  value,
  // Elemento de ícone exibido ao lado do título da métrica
  icon,
  // Classe Tailwind que define a cor da borda superior de destaque (padrão borda azul marinho)
  accent = 'border-navy',
  // Elementos React filhos passados dentro da tag <Card>...</Card>
  children,
  // Classes CSS adicionais do Tailwind que o componente pai queira aplicar
  className = '',
  // Captura quaisquer outros atributos adicionais (ex: onClick, id, role)
  ...props
}) {
  // Retorna a estrutura visual do cartão montada com classes do Tailwind CSS
  return (
    // Elemento contêiner principal com cantos arredondados, fundo branco e borda superior estilizada
    <div
      // Aplica classes de estilo base, classe de destaque no topo e classes customizadas
      className={`bg-white rounded-xl p-5 border-t-4 ${accent} shadow-sm ${className}`}
      // Repassa eventos e atributos restantes para a tag div
      {...props}
    >
      {/* Verifica se pelo menos um dos atributos de métrica (label, icon ou value) foi informado */}
      {(label || icon || value) && (
        // Fragmento que agrupa os elementos do cabeçalho de métrica sem criar nós HTML extras
        <>
          {/* Linha que alinha horizontalmente o ícone e o texto do label */}
          <div className="flex items-center gap-3 mb-3">
            {/* Se houver ícone, renderiza uma caixa com fundo suave ao redor dele */}
            {icon && (
              // Caixa do ícone com fundo semitransparente suave e cantos arredondados
              <div className="bg-ink/5 rounded-lg p-2">
                {/* Renderiza o ícone passado como propriedade */}
                {icon}
              </div>
            )}
            {/* Se houver label, renderiza o texto em caixa-alta e cor suave */}
            {label && (
              // Texto do rótulo em tamanho reduzido e maiúsculo
              <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">
                {label}
              </span>
            )}
          </div>
          {/* Se houver valor principal, exibe-o em tamanho grande e negrito */}
          {value && (
            // Parágrafo do valor em destaque com cor escura
            <p className="text-2xl font-bold text-ink">
              {value}
            </p>
          )}
        </>
      )}
      {/* Renderiza os elementos filhos que forem fornecidos dentro do Card */}
      {children}
    </div>
  )
}
