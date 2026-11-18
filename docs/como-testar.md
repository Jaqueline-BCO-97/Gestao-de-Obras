# Como testar o ObraMaster

## 1. Preparar ambiente isolado

Use um PostgreSQL descartável de desenvolvimento/teste. Não use a base de produção nem uma base compartilhada: migrations e seed alteram dados.

```bash
cd backend
cp .env.example .env
```

Preencha `DATABASE_URL` com a base isolada e defina um `JWT_SECRET` local. Para testar fotos, preencha as três variáveis `CLOUDINARY_*`. Para testar checkout real, preencha `MERCADO_PAGO_ACCESS_TOKEN_TEST` e `MERCADO_PAGO_WEBHOOK_SECRET` com credenciais de teste; nunca use token de produção.

## 2. Instalar, migrar e carregar dados de demonstração

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

O seed cria dados de demonstração e deve ser executado somente na base isolada.

## 3. Rodar as verificações automatizadas

```bash
cd backend
npm test
```

Em outro terminal:

```bash
cd frontend
npm install
node --test tests/*.test.js
npm run lint
npm run build
```

Esses testes não usam o banco. O teste `backend/tests/trocaSenha.test.js` é uma integração separada que cria usuário e funcionário temporários; rode-o somente se `DATABASE_URL` apontar para a base descartável.

## 4. Iniciar a aplicação

Em um terminal:

```bash
cd backend
npm run dev
```

Em outro:

```bash
cd frontend
npm run dev -- --host
```

Abra a URL impressa pelo Vite. Use uma das contas criadas pelo seed: `admin@obramaster.demo`, `cliente@obramaster.demo` ou `colaborador@obramaster.demo`; a senha de demonstração é `Demo@12345`.

## 5. Conferir fluxos por perfil

1. **Admin:** abra Gestão de Obras, confira as obras; aloque um colaborador responsável; encerre uma escala e consulte seu histórico; reagende uma obra e tente um horário sobreposto para confirmar o erro de conflito; registre andamento e escolha se o cliente pode vê-lo.
2. **Colaborador:** abra uma obra alocada, registre anotação/andamento e, com Cloudinary configurado, envie uma foto JPG, PNG ou WebP de até 5 MB. Confirme a aparição na timeline.
3. **Cliente:** confira que só vê obras próprias e eventos visíveis; use “Ver andamento completo”, confirme a conclusão quando disponível e confira o bloqueio/liberação da segunda parcela.
4. **Pagamento sandbox:** com webhook HTTPS público configurado, inicie uma tentativa, conclua o checkout de teste e confirme que só o webhook aprovado atualiza parcela e saldo. Retorno do navegador sozinho não deve marcar pagamento como aprovado.
5. **Isolamento:** tente consultar IDs de outra empresa/cliente e registrar andamento sem escala aberta; a API deve negar sem revelar dados alheios.

## 6. Critério de conclusão

Registre quais fluxos passaram, o ambiente usado e as pendências externas. Não feche issues de upload ou pagamento antes do teste real com os provedores e não aplique migrations/seed fora da base isolada.
