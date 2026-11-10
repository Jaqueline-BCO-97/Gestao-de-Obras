// Importa o StrictMode do React para ajudar a identificar problemas potenciais durante o desenvolvimento
import { StrictMode } from 'react'
// Importa o createRoot da biblioteca react-dom para inicializar a árvore do React no DOM do navegador
import { createRoot } from 'react-dom/client'
// Importa as regras de estilização globais e do Tailwind CSS
import './index.css'
// Importa o componente principal App com todas as configurações de rotas
import App from './App.jsx'

// Seleciona o elemento HTML com id 'root' e renderiza o aplicativo React dentro dele
createRoot(document.getElementById('root')).render(
  // Envolve o App no StrictMode para checagens de boas práticas do React
  <StrictMode>
    {/* Componente raiz que contém as rotas e navegação da aplicação */}
    <App />
  </StrictMode>,
)
