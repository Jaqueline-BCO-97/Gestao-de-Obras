# Issues e comentários preparados para o GitHub

Em 19/11/2026 `gh auth status` indicava credencial inválida nesta sessão. Nenhuma issue foi criada, alterada ou fechada remotamente. O texto abaixo está pronto para copiar no repositório. As issues N1–N20 cobrem os ajustes do PDF; N19–N20 são validações pós-demo.

## Issues concluídas para fechar

Use os comentários curtos abaixo ao fechar cada issue. As issues #15, #16, #65 e #67 foram substituídas por fluxos integrados e também devem ser fechadas com comentário.

| Issue | Comentário de fechamento preparado |
|---|---|
| #1 | Concluída. Estrutura frontend/backend, `.gitignore` e instruções de instalação estão no repositório (`README.md`, `frontend/`, `backend/`). |
| #3 | Concluída. Aplicação React/Vite/Tailwind configurada; build de produção validado em `frontend/`. |
| #4 | Concluída. Componentes `Button`, `Input`, `Card` e `Modal` estão em `frontend/src/components/`; o modal também atende às confirmações do sistema. |
| #6 | Concluída. API Express e rota `/health` em `backend/index.js`. |
| #8 | Concluída. Prisma e PostgreSQL configurados por `backend/prisma/schema.prisma` e `backend/prisma.config.ts`; migration nova de CPF está listada separadamente para aplicação. |
| #9 | Concluída em código. Migrations estão versionadas em `backend/prisma/migrations/`; a migration aditiva de CPF aguarda aplicação por Jaqueline. |
| #10 | Concluída em código. `backend/prisma/seed.js` cria dados demo repetíveis e agora exige `OBRAMASTER_DEMO_SEED=true`, além de recusar produção. |
| #11 | Concluída. `POST /auth/login`, JWT, bcrypt e middleware implementados em `backend/index.js` e `backend/src/middlewares/`. |
| #12 | Concluída. Rotas de usuário e obra em `backend/index.js`, com isolamento por empresa. |
| #13 | Concluída. Login real por API e contas de demonstração em `frontend/src/pages/Login.jsx`. |
| #14 | Concluída. Rotas por papel e proteção em `frontend/src/App.jsx` e `frontend/src/components/ProtectedRoute.jsx`. |
| #15 | Substituída pelas telas integradas do cliente. `Cliente.jsx` e `ClienteObra.jsx` consomem a API; não dependem dos mocks antigos. |
| #16 | Substituída pelos painéis integrados. `Admin.jsx`, `AdminObras.jsx` e `Colaborador.jsx` consomem a API. |
| #19 | Concluída conforme o escopo vigente: `PATCH /obras/:id/agendamento` recebe datas, permite períodos sobrepostos, registra evento e notifica; cobertura em `backend/tests/agendamentoObra.test.js`. |
| #20 | Concluída. Acesso do gerente depende de escala ativa; remoção/movimentação registra histórico e notificação (`backend/src/repositories/obraRepository.js`). |
| #21 | Concluída. Dashboard, detalhe e andamento do cliente usam serviços autenticados em `frontend/src/services/auth.js`. |
| #24 | Concluída em código. Telas administrativas usam rotas e dados da API; `AdminObra.jsx` cobre edição, equipe, fotos, agenda e arquivamento. |
| #32 | Concluída. `PATCH /usuarios/me/senha` e teste de integração em `backend/tests/trocaSenha.test.js`. |
| #59 | Concluída. Cliente acompanha endereço, estado de conferência e confirmação em `frontend/src/pages/ClienteObra.jsx`. |
| #60 | Concluída. Histórico compartilhado em `frontend/src/components/HistoricoObra.jsx`, com filtragem no backend. |
| #62 | Concluída. `/admin/obra/:id` permite consultar e editar a obra (`frontend/src/pages/AdminObra.jsx`). |
| #63 | Concluída. Escalas mantêm histórico e aceitam remoção/movimentação por rotas administrativas. |
| #65 | Substituída pela tela real de pagamento do cliente. `ClientePagamento.jsx` usa checkout, retomada e consulta de parcelas pela API. |
| #68 | Concluída. Clientes, convites, preços e calendário estão conectados à API; cliente também tem consulta somente leitura em `/cliente/precos`. |
| #69 | Concluída. Gestão de funcionários e gerente em `AdminFuncionarios.jsx`, `AdminFuncionario.jsx` e `AdminGerentes.jsx`. |
| #70 | Concluída. Solicitação e confirmação de conclusão estão nas rotas de obra em `backend/index.js`. |
| #71 | Concluída. `ObraEscala` conserva datas, autor e motivo das alterações. |
| #67 | Substituída pelo seed idempotente e isolado de demonstração em `backend/prisma/seed.js`; publicação e reset remoto permanecem fora do escopo desta entrega. |

## Issues novas N1–N20

Cadastre cada item como issue separada, usando o título, critérios e label abaixo.

### N1 — Reduzir chamadas repetidas e medir a experiência

- **Label:** `performance`
- **Critérios:** deduplicar GET idêntico em andamento; medir requisições concorrentes e bundle; conferir login, logout, mudança de perfil e telas principais em ambiente demo; registrar números com mesmo navegador e banco.
- **Situação nesta branch:** GET idênticos simultâneos são deduplicados no frontend; listagens limitam histórico e parcelas e evitam relações não usadas. O backend agora expõe `X-DB-Query-Count` e inclui teste e script para medir consultas por rota. Benchmark real e aceite visual continuam pós-demo porque dependem do ambiente.

### N2 — Exibir erros e confirmações junto da ação

- **Label:** `ux`
- **Critérios:** erro/sucesso visível junto ao formulário, campo ou botão correspondente; nenhum alerta de ação no topo da página; mensagens anunciadas por `role=alert` ou `role=status`.
- **Situação nesta branch:** formulários principais ajustados; revisar manualmente todas as telas no roteiro visual.

### N3 — Usar modal próprio para confirmações

- **Label:** `ux`
- **Critérios:** substituir `alert()` e `confirm()` por `Modal` do sistema; apresentar a pergunta e apenas as ações Confirmar e Cancelar; cancelar não executa a operação.
- **Situação nesta branch:** implementada por `useConfirmacao.jsx`; teste atualizado para a conclusão do cliente.

### N4 — Validar upload de fotos no Cloudinary

- **Label:** `bug`, `integração`
- **Critérios:** perfil, obra e andamento aceitam JPG/PNG/WebP até 5 MB; API valida tipo/tamanho; erro explica quais variáveis Cloudinary faltam; imagem enviada aparece depois de recarregar.
- **Situação nesta branch:** código e validações implementados; envio real requer credenciais do ambiente demo.

### N5 — Completar os dados de perfil dos três papéis

- **Label:** `ux`, `perfil`
- **Critérios:** foto na navegação e no perfil; CPF com máscara e validação; endereço editável; segundo telefone aparece só após “Adicionar telefone”; foto e dados persistem nos três perfis.
- **Situação nesta branch:** implementada; CPF depende da migration aditiva.

### N6 — Preparar dados e contrato de demonstração do cliente

- **Label:** `demo`, `dados`
- **Critérios:** cliente demo tem telefone, endereço e CPF de teste válido; seed é idempotente e só roda com confirmação de ambiente demo; obras demo apontam para PDF de exemplo clicável.
- **Situação nesta branch:** implementada em `backend/prisma/seed.js` e `docs/contrato-exemplo.pdf`; não executar contra banco compartilhado.

### N7 — Corrigir lista e arquivamento de obras no Admin

- **Label:** `bug`, `admin`
- **Critérios:** botões Gerenciar/Solicitar conferência alinhados; somente obra AGENDADA sem parcela paga nem pagamento em processamento pode arquivar; em execução ou com pagamento nunca é apagada/arquivada; erro fica no bloco de arquivamento; primeira parcela demo de “Casa de máquinas” volta a pendente.
- **Situação nesta branch:** regras, alinhamento e obra demo “Casa de máquinas” com 1ª parcela pendente implementados.

### N8 — Tornar foto do funcionário opcional

- **Label:** `bug`, `admin`
- **Critérios:** cadastro salva sem foto; erro de cadastro correto; edição mostra retângulo/placeholder abaixo de Nome e botão “Adicionar foto” ou “Trocar foto”; valida JPG/PNG/WebP até 5 MB.
- **Situação nesta branch:** implementada em `AdminFuncionarios.jsx`, `AdminFuncionario.jsx` e `backend/index.js`.

### N9 — Exibir convites pendentes na lista de gerentes

- **Label:** `ux`, `admin`
- **Critérios:** gerente convidado aparece em “Gerentes com acesso” sem conta ativa e com estado “Convite pendente”; após aceitar, passa a aparecer como gerente ativo.
- **Situação nesta branch:** implementada em `AdminGerentes.jsx`.

### N10 — Bloquear início e confirmação para cliente com convite pendente

- **Label:** `bug`, `backend`, `admin`
- **Critérios:** front desabilita iniciar obra e confirmar 1ª parcela; backend responde conflito se chamada direta; aceite do convite libera as ações.
- **Situação nesta branch:** implementada em `obraRepository.js`, `backend/index.js`, `AdminObra.jsx` e `Pagamentos.jsx`.

### N11 — Disponibilizar preços de referência ao cliente

- **Label:** `feature`, `cliente`
- **Critérios:** rota `/cliente/precos` e item no menu; só consulta preços ativos da empresa autenticada; nenhum controle de edição para cliente.
- **Situação nesta branch:** implementada em `ClientePrecos.jsx` e `GET /tabela-precos/cliente`.

### N12 — Mostrar agendamentos futuros no calendário

- **Label:** `bug`, `calendario`
- **Critérios:** obra agendada para meses futuros aparece em “Próximas obras” em ordem de data; reagendamento persiste e notifica os destinatários da obra.
- **Situação nesta branch:** agendamentos sem limite de janela são listados; seed contém obra para fevereiro de 2027.

### N13 — Destacar parcelas vencidas

- **Label:** `bug`, `pagamentos`
- **Critérios:** segunda parcela de uma obra demo vencida; estado “Atrasada” destacado no cliente e no Admin; parcelas pagas não são marcadas como atrasadas.
- **Situação nesta branch:** seed e telas implementados; vencimento da demo é 20/05/2026.

### N14 — Gerar notificações por evento e retroativas

- **Label:** `feature`, `notificações`
- **Critérios:** histórico demo idempotente inclui pagamento, contrato, criação/edição, relato, anotação, foto, escala, agenda e conclusão; novas ações notificam Admin, cliente e gerentes ativos conforme visibilidade; filtro por obra não mistura timelines.
- **Situação nesta branch:** gerador e filtro implementados; cobertura manual no banco demo pendente.

### N15 — Atualizar o cabeçalho do gerente

- **Label:** `ux`, `perfil`
- **Critérios:** cabeçalho do gerente mostra foto de `foto-colaborador.png`, tem espaço adequado e não mostra o selo “Acesso Operacional”.
- **Situação nesta branch:** implementada em `Colaborador.jsx`.

### N16 — Revogar acesso ao mover ou remover gerente

- **Label:** `bug`, `segurança`
- **Critérios:** leitura e escrita na obra antiga bloqueadas após encerramento/movimentação; obra antiga sai do painel; gerente recebe notificação “Você foi movido para outra obra”; histórico da escala permanece.
- **Situação nesta branch:** implementada e coberta em `backend/tests/alocacaoObra.test.js`.

### N17 — Numerar obras do gerente pela ordem de alocação

- **Label:** `ux`, `gerente`
- **Critérios:** painel mostra “Obra 1, Obra 2…” pela ordem de início da alocação; número recalcula ao sair/mover; interface não revela IDs técnicos; detalhe exibe somente `Obra: <nome>`.
- **Situação nesta branch:** implementada em `obraRepository.js` e `Colaborador.jsx`.

### N18 — Filtrar histórico e notificações pela obra atual

- **Label:** `bug`, `gerente`
- **Critérios:** ao abrir uma obra, timeline e notificações contêm somente eventos com aquele `obraId`; gerente não vê eventos de outras obras.
- **Situação nesta branch:** endpoint `/notificacoes?obraId=...`, tela e link do detalhe implementados.

### N19 — Validar integrações reais pós-demo

- **Label:** `pós-demo`, `integração`
- **Critérios:** testar upload Cloudinary ponta a ponta e pagamento Mercado Pago sandbox em ambiente isolado; não armazenar credenciais em issue ou Git; registrar resultado e resposta de falhas.
- **Situação:** dependente das credenciais e URL de teste do ambiente.

### N20 — Executar aceite visual integrado pós-demo

- **Label:** `pós-demo`, `qa`
- **Critérios:** executar `docs/teste-visual.md` para Admin, Cliente e Gerente; testar em 375 px e desktop; registrar tempos e número de chamadas sob as mesmas condições; confirmar bloqueios e permissões com banco demo.
- **Situação:** roteiro pronto; teste manual precisa ser executado pela equipe.
