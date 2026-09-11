// Importa o Express, o framework que cuida das rotas da API
const express = require('express');
const app = express();

// Porta que o servidor vai escutar (usa variável de ambiente se existir, senão 3000)
const PORT = process.env.PORT || 3000;

// Rota de "saúde" — serve pra confirmar que o servidor está de pé e respondendo
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Liga o servidor pra escutar na porta definida acima
app.listen(PORT, () => {
  console.log(`Backend do ObraCheck rodando na porta ${PORT}`);
});