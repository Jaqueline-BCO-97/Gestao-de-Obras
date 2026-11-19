# Planejamento e auditoria de issues

Auditoria do código nesta branch em 19/11/2026. O planejamento detalhado que existia na raiz foi substituído por este quadro atualizado. Foram comparadas as issues #1–#33 e #59–#72, conforme solicitado.

As fontes `docs/planejamento.md`, `docs/prompt-ajustes.md` e `docs/escopo-v3.md` citadas na solicitação não estavam presentes neste checkout. Os critérios foram conferidos no planejamento disponível na raiz e no PDF `erros4.pdf`; `docs/escopo-do-projeto.md` foi tratado como documentação antiga, não como escopo oficial. A situação abaixo descreve o código e a validação local; não representa mudança no quadro do GitHub.

Legenda: **Implementada** = critérios de código atendidos; **Parcial** = falta validação externa, documentação ou critério; **Pendente** = não verificada/concluída; **Substituída** = atendida por fluxo posterior.

## Issues #1–#33

| # | Título | Situação atual | Evidência ou pendência |
|---|---|---|---|
| 1 | Configurar repositório: frontend/backend, .gitignore, README | Implementada | `frontend/`, `backend/`, `.gitignore`, `README.md`. |
| 2 | Configurar branches e regras de PR | Parcial | Branch própria e histórico de PR existem; proteção da `main` é configuração remota e não foi verificada. |
| 3 | Criar projeto React + Vite + TailwindCSS | Implementada | `frontend/package.json`, `frontend/vite.config.js`, build executado. |
| 4 | Criar componentes base (Button, Input, Card, Modal) | Implementada | Componentes em `frontend/src/components/`; Modal também atende confirmações internas. |
| 5 | Modelar schema do banco | Parcial | `backend/prisma/schema.prisma`; novo CPF usa migration aditiva pendente. Diagramas existentes precisam ser atualizados. |
| 6 | Criar projeto Node + Express | Implementada | `backend/index.js`, `/health` e estrutura `backend/src/`. |
| 7 | Definir contrato de API | Parcial | `docs/api-contract.md` existe, mas ainda precisa refletir rotas e respostas atuais. |
| 8 | Configurar Prisma + conexão com PostgreSQL | Implementada | `backend/prisma/schema.prisma`, `backend/prisma.config.ts`; conexão verificada antes desta migration. |
| 9 | Criar migrations no PostgreSQL | Implementada em código | Migrations versionadas; `20261119150000_usuario_cpf` ainda precisa ser aplicada por Jaqueline. |
| 10 | Criar seed de dados de teste | Implementada | `backend/prisma/seed.js` idempotente para dados demo, incluindo “Casa de máquinas”, com proteção explícita `OBRAMASTER_DEMO_SEED=true`; não executado neste banco. |
| 11 | Implementar autenticação (JWT + Bcrypt) | Implementada | `POST /auth/login`, middleware e hash em `backend/index.js`. |
| 12 | Implementar CRUD de usuário e obra | Implementada | Rotas de usuários e obras em `backend/index.js`; autorização por empresa. |
| 13 | Criar tela de Login | Implementada | `frontend/src/pages/Login.jsx`, acessos demo e validação local. |
| 14 | Criar estrutura de rotas (React Router) | Implementada | `frontend/src/App.jsx`, `ProtectedRoute` e rotas por perfil. |
| 15 | Telas mockadas: Dashboard Cliente e Detalhe da Obra | Substituída | Fluxos integrados à API em `Cliente.jsx` e `ClienteObra.jsx`; comentário preparado em `issues-pendentes.md`. |
| 16 | Telas mockadas: Dashboard Admin, Gestão de Obras e Colaborador | Substituída | Painéis usam a API, incluindo `Admin.jsx`, `AdminObras.jsx` e `Colaborador.jsx`; comentário preparado. |
| 17 | Endpoint de andamento (foto e anotação) | Parcial | Rotas de andamento e validação de arquivos existem; envio real ao Cloudinary depende de credenciais no ambiente. |
| 18 | Endpoint de pagamento + Mercado Pago sandbox | Parcial | Checkout, retomada e webhook implementados; aprovação real no sandbox não foi executada. |
| 19 | Endpoint de agendamento + validação de conflito | Implementada | `PATCH /obras/:id/agendamento`, calendário, histórico e notificação; testes em `backend/tests/agendamentoObra.test.js`. |
| 20 | Endpoint de alocação de colaborador por obra | Implementada | Acesso limitado por escala aberta, remoção/movimentação notificada e teste em `backend/tests/alocacaoObra.test.js`. |
| 21 | Integrar Dashboard Cliente, Detalhe da Obra e Andamento com API real | Implementada | `Cliente.jsx`, `ClienteObra.jsx`, `ClienteAndamento.jsx` e serviços em `frontend/src/services/auth.js`. |
| 22 | Integrar Confirmar conclusão e Pagamento (Cliente) com API real | Implementada em código | Rotas e telas conectadas; validação de pagamento real continua dependente do sandbox. |
| 23 | Integrar Dashboard Colaborador e Registrar Andamento com API real | Parcial | Painel e escrita por API; envio real de imagem ao Cloudinary ainda depende de credenciais. |
| 24 | Integrar telas do Admin com API real | Implementada | Gestão de obras, funcionários, clientes, gerentes, preços, agenda, pagamentos e notificações usam serviços de API. |
| 25 | Testar fluxo completo (cliente, gerente e admin) | Parcial | Testes mockados passaram; fluxo manual com banco isolado e os três logins está descrito em `teste-visual.md`. |
| 26 | Corrigir bugs de integração front/back | Parcial | Ajustes desta entrega cobrem regras do PDF; ainda falta aceite manual completo em banco de demonstração. |
| 27 | Ajustes de responsividade mobile | Pendente | Não foi feita uma revisão visual completa em viewport de 375 px. |
| 28 | Revisão de segurança | Parcial | Autorização e isolamento cobertos em testes; revisão formal completa e Cloudinary real seguem pendentes. |
| 29 | Conferir integridade dos dados e documentar o schema final | Parcial | Schema e migrations versionados; nova migration não aplicada e diagramas ainda não refletem todas as mudanças. |
| 30 | Atualizar documentação (README e docs/escopo) | Parcial | `README.md`, `planejamento.md`, `issues-pendentes.md` e `teste-visual.md` atualizados; escopo v3 oficial não estava disponível. |
| 31 | Preparar demo/apresentação | Parcial | Seed e roteiro cobrem os fluxos solicitados; não houve teste em outro computador. |
| 32 | Endpoint de troca de senha | Implementada | `PATCH /usuarios/me/senha`; teste de integração existente. |
| 33 | Tela de Perfil e troca de senha | Implementada em código | Perfil dos três papéis, foto, endereço, CPF e telefones; CPF requer aplicar a migration aditiva. |

## Issues #59–#72

| # | Título | Situação atual | Evidência ou pendência |
|---|---|---|---|
| 59 | Ajustes do Cliente: endereços, Aguardando conferência e Confirmar conclusão | Implementada | `ClienteObra.jsx`, endereço e fluxo de aceite. |
| 60 | Componente único de Histórico da Obra | Implementada | `frontend/src/components/HistoricoObra.jsx` e timeline filtrada pela API. |
| 61 | Tela do Cliente: acompanhar andamento | Parcial | Rota `/cliente/obra/:id/andamento`; Cloudinary real depende de credenciais. |
| 62 | Detalhe e edição de Obra (Admin) | Implementada | `/admin/obra/:id`, edição, equipe e histórico em `AdminObra.jsx`. |
| 63 | Admin: escala de colaboradores com histórico | Implementada | Rotas de alocação, encerramento e movimentação em `obraRepository.js`. |
| 64 | Admin: anotações e fotos da obra | Parcial | Anotações/eventos e upload integrados; Cloudinary real não foi verificado. |
| 65 | Tela de Pagamento (Cliente), mock | Substituída | Tela real ligada à API em `ClientePagamento.jsx`; comentário preparado em `issues-pendentes.md`. |
| 66 | Contrato de exemplo em PDF com aceite simulado | Parcial | PDF de demonstração e link clicável entregues; aceite eletrônico persistido não faz parte do ajuste validado. |
| 67 | Persistência da demo, botão Resetar e publicação | Substituída | Seed idempotente e dados demo substituem a persistência mockada; publicação/reset remoto não foram pedidos aqui. Comentário preparado. |
| 68 | Telas: Meus Clientes, Aceitar Convite, Tabela de Preços e Calendário | Implementada | Telas e endpoints existentes; cliente agora também consulta `/cliente/precos`. |
| 69 | Gestão de Funcionários (Admin) | Implementada | Cadastro/edição e foto opcional em `AdminFuncionarios.jsx` e `AdminFuncionario.jsx`. |
| 70 | Backend: solicitar e confirmar conclusão | Implementada | Rotas de solicitação e confirmação em `backend/index.js` e `obraRepository.js`. |
| 71 | Backend: histórico de escala | Implementada | `ObraEscala` conserva início, fim, autor e motivo. |
| 72 | Backend: log de auditoria e notificações | Parcial | Notificações por evento e retroativas no seed; auditoria completa e validação do seed em banco demo continuam pendentes. |

## Pendências de validação

- Aplicar a migration `20261119150000_usuario_cpf` no banco alvo, depois da revisão do SQL, por Jaqueline.
- Executar o roteiro visual num banco isolado de demonstração e validar upload real com Cloudinary configurado.
- Validar pagamento no ambiente sandbox do Mercado Pago e testar layout em 375 px.
- Atualizar `docs/api-contract.md` e os diagramas depois da confirmação do schema aplicado.
- Registrar no quadro GitHub os comentários e issues listados em `docs/issues-pendentes.md`; a sessão atual não tinha autenticação GitHub válida.
