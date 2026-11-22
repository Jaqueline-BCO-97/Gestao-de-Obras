# Planejamento e auditoria de issues

## Execução de ajustes-5 — 21/11/2026

Este registro atualiza o estado do código nesta branch. Em conflito de critério, prevalece `docs/escopo-do-projeto.md`.

| Bloco | Antes | Depois | Validação e limite |
|---|---|---|---|
| Desempenho | Autenticação consultava o banco em cada pedido; resumos carregavam relações amplas; a interface só deduplicava GETs simultâneos; imagens de demonstração eram PNGs de cerca de 0,7–0,8 MB. | Cache de sessão de até 60 s com invalidação quando muda acesso; consultas SQL agregam os dados das rotas de listagem; cache GET de 15 s invalidado após mutações; páginas sob demanda com esqueleto; fotos WebP de 7–13 KB. O backend mede instruções de dados por requisição no cabeçalho `X-DB-Query-Count`. | Banco Supabase indisponível (P1001 em `npx prisma migrate status`). Não foi possível medir latência real nem comparar SQL antes/depois. O script `backend/scripts/medir-latencia.js` imprime 3 rodadas e contagem de queries por rota. |
| Navegação | O menu era parte de cada painel e sumia em telas de detalhe. | Menu fixo global em telas autenticadas; o perfil mantém só a lateral; menu não aparece no checkout online. Páginas têm um único retorno por estado. | Conferir no roteiro visual depois que a interface estiver disponível. |
| Correções | Erro no calendário, edição de funcionário e mensagens de upload ainda apareciam nos fluxos informados. | Calendário agenda por datas, sem horários, e permite períodos sobrepostos conforme `docs/escopo-do-projeto.md`; programação de funcionário pode ficar vazia; validação de arquivo e mensagens Cloudinary explícitas; máscara de telefone; cores de pagamento verde/amarelo/vermelho. | A validação automatizada desta revisão está descrita no PR. Upload Cloudinary real depende das três credenciais; Mercado Pago sandbox também não foi configurado. |
| Funcionalidades | Não havia filtro de notificações, exclusão controlada de preço/cliente/convite expirado, detalhes pessoais exclusivos de Admin, alocação de gerentes existentes nem plano de parcelas em cadastro/edição de obra. | Esses controles e filtros foram adicionados. Gerentes ativos com conta podem ser selecionados na obra; funções repetidas são rejeitadas. Endereço completo do cliente é levado do convite ao perfil. | Exclusões em código têm guardas; nenhum registro foi excluído neste ambiente. CPF/CNPJ validam formato e dígitos verificadores, não provam existência, titularidade ou situação cadastral. |
| Dados demo | As obras demo do cliente não tinham PDF de exemplo nem uma obra própria para testar o aceite final. | `frontend/public/contrato-demo.pdf` foi copiado do PDF solicitado; o seed mantém/atribui o contrato a todas as obras do Cliente Demo e inclui uma obra Aguardando conferência. | Seed idempotente atualizado, mas não executado contra o banco compartilhado ou sem conexão. Checkout sandbox segue pendente. |

### Migrations

A verificação obrigatória do estado falhou por indisponibilidade de conexão (`P1001`, host do Supabase em `sa-east-1`). Portanto, não é possível afirmar quais arquivos já estão aplicados no banco. A sequência ordenada do repositório é:

1. `20260911025619_init_usuarios`
2. `20260930000000_add_obras`
3. `20261115180750_modelo_v2_1`
4. `20261115220000_pagamento_mercado_pago`
5. `20261118120000_convites`
6. `20261119090000_dados_completos_obras`
7. `20261119130000_perfil_financeiro_e_equipes`
8. `20261119150000_usuario_cpf`
9. `20261121120000_indices_consulta` — nova; apenas índices aditivos.
10. `20261121130000_enderecos_perfil` — nova; adiciona campos opcionais de endereço.

Revise o resultado de `npx prisma migrate status` no banco de destino e aplique somente migrations pendentes, nesta ordem. Nenhuma migration foi aplicada aqui. Não foi alterado `.env`.

### Dados e uploads

Não foi possível localizar nem excluir a obra de teste com todos os critérios indicados (`Casa de maquinas`, Agendada, Cliente Demo, Avenida Ana Costa 67), nem a empresa de teste: o banco não respondeu. Nenhum outro dado foi consultado ou removido.

Para habilitar fotos, contratos e comprovantes, configure no ambiente do backend `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET`, reinicie o backend e repita o upload em cada tela. Os fluxos de código validam tipo/tamanho e mostram erro explícito se as chaves faltarem; sem credenciais não é possível confirmar o envio real de ponta a ponta.

Para CPF e CNPJ, os dígitos verificadores identificam erros matemáticos comuns. Eles não confirmam que o número foi emitido, está ativo, pertence à pessoa informada ou é autêntico; isso exige consulta a uma fonte oficial e autorização para essa integração.

### Medição de latência

Com backend e banco de demonstração acessíveis, execute `node backend/scripts/medir-latencia.js` na raiz do projeto. Opcionalmente, defina `OBRAMASTER_API_URL` e `OBRAMASTER_DEMO_PASSWORD`. O script compara `/health` (sem query de banco) com painéis, detalhes de obra, perfil e notificações; não preenche medidas fictícias.

O roteiro de clique está em `docs/teste-visual.md`. Calendário e contrato da API usam datas, sem horários, e permitem períodos sobrepostos, conforme `docs/escopo-do-projeto.md`. Este bloco supersede as observações de 19/11 abaixo; nenhuma exclusão de dados nem operação remota foi realizada nesta atualização.

---

Registro histórico da auditoria de 19/11/2026; consulte “Execução de ajustes-5” acima para o estado atual. Auditoria do código nesta branch em 19/11/2026. O planejamento detalhado que existia na raiz foi substituído por este quadro atualizado. Foram comparadas as issues #1–#33 e #59–#72, conforme solicitado.

As fontes `docs/planejamento.md`, `docs/prompt-ajustes.md` e `docs/escopo-v3.md` citadas na solicitação não estavam presentes neste checkout. Os critérios foram conferidos no planejamento disponível na raiz e no PDF `erros4.pdf`; `docs/escopo-do-projeto.md` é a referência de negócio aplicada nesta atualização, conforme a orientação vigente. A situação abaixo descreve o código e a validação local; não representa mudança no quadro do GitHub.

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
| 19 | Endpoint de agendamento por datas | Implementada | `PATCH /obras/:id/agendamento` permite sobreposição, grava histórico e notifica; testes em `backend/tests/agendamentoObra.test.js`. |
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
