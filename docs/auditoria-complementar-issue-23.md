# Auditoria complementar — Issue #23 — ObraMaster

Data: 2026-11-17  
Branch auditada: `niinapimenta`

## Escopo e método

Auditoria somente leitura. Foram consultados os corpos das Issues #23, #37, #38, #39, #43 e #44 no GitHub; as rotas e telas locais; o schema Prisma, endpoint, repositório e testes de andamento; o componente de timeline; dependências e nomes das variáveis de ambiente. Os valores de variáveis secretas não foram lidos nem registrados.

## Issues relacionadas

### #23 — Integrar Dashboard Colaborador + Registrar Andamento com API real

- **Estado:** aberta.
- **Descrição completa:** “#23 — Integração: Colaborador — Descrição: Conectar o dashboard do colaborador e a tela de registro de andamento à API real.”
- **Critérios de aceitação completos:** “Colaborador só vê as obras alocadas a ele”; “Upload de foto/anotação reflete na timeline da obra”; “Incluir as telas novas (#37, #38, #39, #43, #44)”.
- **Funcionalidade esperada:** painel do colaborador vinculado à API; registrar anotação/andamento com reflexo no histórico; incluir as entregas identificadas pelos cinco números citados.
- **Implementação local:** há `Colaborador.jsx` e `ColaboradorObra.jsx`, mas ambas usam dados mockados. O painel fixa o colaborador de ID 1 e calcula as obras a partir de `colaboradoresMock`/`obrasMock`. A tela de detalhes consulta `obrasMock`, cruza novamente o vínculo com mocks e acrescenta eventos somente ao estado local. O formulário permite escolher fotos, mas só gera `blob:` para preview.
- **Sobreposição:** endpoint textual de andamento e persistência estão implementados no backend em escopo anterior (#17); os itens #37–#44 são entregas-base que já foram integradas e não descrevem cinco telas novas nesta branch.

### #37 — Consolidação sem conflitos: frontend + backend Supabase (sem Prisma)

- **Estado:** PR mergeado; título preservado do GitHub.
- **Descrição completa:** consolida sem conflitos as PRs #34, #35 e #36; afirma que as PRs mexiam nos mesmos arquivos com conteúdos incompatíveis; consolida Prisma, troca a origem do banco de Neon para Supabase via `DATABASE_URL`, backend com `/`, `/health` e `/usuarios`, frontend Vite/React; registra validações (`prisma validate`, `prisma generate`, instalação, chamadas HTTP e build); aponta configuração manual do Supabase e ações pós-merge (fechar #34–#36 como superseded).
- **Critérios:** não há lista intitulada “critérios de aceitação”; o corpo descreve escopo de consolidação, validações e passos de configuração.
- **Relação com #23:** é infraestrutura anterior do projeto citada por #23; não representa uma tela de colaborador.
- **Implementação parcial/local:** infraestrutura React, rotas e Prisma/Supabase existem. A alegação histórica “sem Prisma” no título contradiz o próprio corpo (“Prisma mantido”) e o estado local, que usa Prisma. Isso parece título legado, não requisito a reaplicar.
- **Sobreposição:** Supabase/PostgreSQL já está ligado por `DATABASE_URL`; não há integração com Supabase Storage identificada.

### #38 — feat: implementa autenticação com jwt e bcrypt

- **Estado:** PR mergeado.
- **Descrição completa:** adiciona login por e-mail/senha; hash bcrypt; token JWT; middleware de validação JWT; `GET /auth/me`; proteção da rota de usuários; validação de token ausente, inválido e expirado; não retorna senha/hash; fecha #11.
- **Critérios:** corpo não os enumera formalmente; os itens acima são as funcionalidades declaradas.
- **Relação com #23:** base de autenticação usada para restringir API ao usuário autenticado.
- **Implementação local:** login e rotas protegidas estão presentes. O backend também rejeita no login colaborador sem funcionário ativo e com vínculo empresarial incompatível.
- **Sobreposição:** autenticação é funcionalidade existente; #23 deve consumi-la, não recriá-la.

### #39 — feat: implementa troca de senha do usuario

- **Estado:** PR mergeado.
- **Descrição completa:** implementa `PATCH /usuarios/me/senha`; valida senha atual com bcrypt; grava a nova senha em hash; protege com JWT; limita alteração ao próprio usuário; não retorna senha/hash; inclui testes; fecha #32.
- **Critérios:** não formalizados como checklist separado; funcionalidades acima compõem o escopo declarado.
- **Relação com #23:** item de infraestrutura/autenticação mencionado no critério de “incluir as telas novas”, mas não é tela de obra nem requisito de upload.
- **Implementação local:** existe endpoint, serviço `alterarSenha` e tela de perfil; rota `/perfil` é acessível a todos os perfis autenticados.
- **Sobreposição:** concluída anteriormente; não deve ser refeita.

### #43 — feat: configura Vite+Tailwind, componentes base e contrato de API (issues #3, #4, #7)

- **Estado:** PR mergeado.
- **Descrição completa:** entrega as Issues #3, #4 e #7 da Semana 1 isoladamente: projeto Vite + React + TailwindCSS em `frontend/`; componentes base reutilizáveis Button, Input, Card e Modal; contrato da API em `docs/api-contract.md`.
- **Critérios:** o corpo lista entregas, sem checklist separado.
- **Relação com #23:** infraestrutura visual e contrato que a tela pode reutilizar; não é uma tela nova.
- **Implementação local:** Vite, Tailwind, componentes, serviço de autenticação e contrato API estão presentes.
- **Sobreposição:** base já integrada; contrato atual inclui rotas de andamento e declara upload indisponível.

### #44 — Completar contrato de API (pagamento, andamento, preços)

- **Estado:** issue fechada.
- **Descrição completa:** “O contrato de API mergeado no PR #43 cobre só auth e parte de /obras. Faltam os endpoints de pagamento, andamento e tabela de preços, previstos originalmente na issue #7.”
- **Critérios:** completar/documentar os endpoints citados; a descrição não lista checklist ou implementação de tela.
- **Relação com #23:** fornece documentação de contrato para a integração. Não pede upload por si só.
- **Implementação local:** `docs/api-contract.md` documenta `POST /obras/:id/andamento`, os três tipos aceitos, limite de 2000 caracteres, status de resposta e a resposta 501 para fotos; pagamentos também estão documentados. Tabela de preços consta entre funcionalidades ainda não implementadas.
- **Sobreposição:** contrato e endpoint de andamento já foram entregues em escopos anteriores.

## Telas e roteamento

- `frontend/src/pages/Colaborador.jsx` existe e está acessível em `/colaborador`, protegida para perfil `COLABORADOR` em `frontend/src/App.jsx`.
- `frontend/src/pages/ColaboradorObra.jsx` existe e está acessível em `/colaborador/obra/:id`, também protegida para `COLABORADOR`.
- `frontend/src/pages/Perfil/Perfil.jsx` existe em `/perfil` para qualquer perfil autenticado; dá suporte à funcionalidade descrita em #39.
- Não foram encontradas telas identificadas como #37, #38, #39, #43 ou #44. Esses números são issues/PRs de infraestrutura, autenticação, senha e contrato, já refletidos nos arquivos locais. Assim, a expressão “incluir as telas novas” na #23 é imprecisa em relação aos registros originais; não há cinco páginas novas a implementar com base nesses números.
- As telas de colaborador existem visualmente, mas a integração com API real ainda falta.

## Situação do upload e persistência

### O que existe

- `ObraEvento` contém `fotoUrl String?`; migration existente também criou a coluna textual. A imagem não é armazenada no PostgreSQL, somente uma referência poderia ser armazenada nesse campo.
- `TipoEvento` inclui `ANOTACAO`, `ATUALIZACAO`, `OCORRENCIA` e `FOTO`.
- `POST /obras/:id/andamento` autentica e exige perfil colaborador; aceita JSON com descrição e tipo textual. Rejeita multipart, `foto` e `fotoUrl` com HTTP 501. O repositório cria evento com `fotoUrl: null`.
- O repositório valida, dentro de transação, empresa, usuário/funcionário ativo e escala aberta; a autoria vem do token. Eventos são persistidos no mesmo `ObraEvento`.
- `GET /obras` e `GET /obras/:id` retornam timeline com tipo, descrição, data, hora e autor, filtrando eventos de colaboradores para ocultar pagamento, aprovação de orçamento e contratação. O mapeamento atual não inclui `fotoUrl`.
- A UI atual do colaborador deixa selecionar arquivos e cria URLs `blob:` para preview, mas no submit não envia arquivo: cria evento fictício em estado React com URLs locais. As URLs não sobrevivem à sessão e não são persistidas.
- `HistoricoObra.jsx` mostra tipo, data/hora, autor e descrição, mas não renderiza imagem. A tela do cliente exibe aviso de que a API ainda não disponibiliza fotos.
- Não há dependência de upload (por exemplo, `multer`) nem SDK do Supabase no package manifest. O backend usa Prisma/Postgres Supabase via `DATABASE_URL`.

### O que falta

- Decisão e configuração externa de armazenamento persistente; bucket, política de acesso e estratégia de URL.
- Validação de arquivo no servidor, limites de tamanho e lista permitida de MIME/type (com validação de conteúdo, não apenas extensão ou cabeçalho declarado).
- Endpoint/fluxo que receba o binário com autenticação e associe a operação à obra e empresa derivadas do token e da autorização de escala.
- Upload seguro ao Storage; gravar referência no evento e devolver/expor essa referência em `GET` sem vazar acesso a empresas ou obras alheias.
- Apresentação de foto na timeline do colaborador e, se previsto por `visivelParaCliente`, também na timeline do cliente.
- Tratamento transacional distribuído/compensatório de falha entre Storage e PostgreSQL e política de limpeza de objetos órfãos.
- Atualizar testes do backend e frontend para upload, rejeições, associação correta, timeline e falhas parciais.

## Modelo da timeline versus requisito

- **Anotação sem foto:** suportada por `ObraEvento` e pelo endpoint, desde que tenha descrição não vazia de até 2000 caracteres e tipo válido.
- **Foto com descrição:** o schema permite uma referência opcional (`fotoUrl`) mais uma descrição, mas a rota barra a foto e o repositório grava `null`; portanto ainda não funciona pela API.
- **Foto sem descrição:** não suportada pelo contrato atual: descrição é obrigatória. O texto original da #23 não esclarece se seria permitido. Isso precisa de decisão de produto antes da implementação de upload.
- **Autor/data/hora/tipo:** persistidos e retornados para eventos de texto; autor/data/hora vêm do servidor/token.
- **Imagem na timeline:** ainda não suportada pela resposta da API (campo não mapeado) nem pelo componente compartilhado `HistoricoObra`.
- **Visibilidade:** o evento de andamento é criado com `visivelParaCliente: true`; a API filtra histórico do cliente por essa coluna. Logo, foto associada a esse evento deve seguir a mesma política, salvo decisão expressa diferente.

## Segurança e isolamento

As consultas de listagem e detalhes restringem colaborador à empresa do token e a uma escala aberta associada ao usuário. O endpoint de andamento verifica funcionário ativo, empresa, perfil do usuário e alocação aberta na transação; usuário/autor vem do JWT. Colaborador recebe resposta sem campos financeiros e sem certos tipos de evento. O login rejeita colaborador inativo ou com vínculo de empresa inválido.

Para Storage, não se deve aceitar empresaId, autorId ou permissão informados pelo cliente. O backend deve carregar obra e alocação autorizadas antes de aceitar arquivo e formar um caminho não controlado pelo usuário, por exemplo `empresa/{empresaId}/obras/{obraId}/eventos/{eventoId}/{arquivo}`. Não basta esconder URL no frontend. Bucket privado e URLs assinadas de curta duração (ou endpoint proxy autorizado) evitam acesso público irrestrito. As políticas de Storage/RLS, se utilizadas, precisam vincular o objeto ao tenant e validar empresa/obra; credencial service-role nunca deve ir ao frontend. O cliente só recebe imagens de eventos permitidos pela mesma regra de timeline. Remover/expirar URL assinada não substitui autorização da API.

## Estratégia técnica recomendada para fotos

Supabase Storage é uma opção compatível com a infraestrutura, mas não foi encontrada configuração ou bucket de Storage no código. Não se deve assumir que existe nem criar um nesta auditoria.

1. Definir produto: formatos aceitos, tamanho máximo, quantidade por evento, se foto sem descrição é permitida, visibilidade para cliente, retenção e política de exclusão.
2. Definir responsável por bucket privado e políticas externas do Storage; separar credenciais de Storage dos valores que ficam no cliente. Hoje só foram identificados os nomes `PORT`, `DATABASE_URL`, `DIRECT_URL` e `JWT_SECRET` em `backend/.env`; nenhum valor foi exibido. Não há variável de Storage no exemplo local.
3. Adicionar integração server-side ao backend e limite de corpo. Validar quantidade, bytes, MIME permitido (ex.: JPEG/PNG/WebP se produto aprovar), assinatura real do formato, tamanho, extensão e nomes. Rejeitar SVG e conteúdo executável por padrão; considerar reprocessar imagens e remover metadados EXIF/localização.
4. Autorizar no backend empresa/obra/funcionário ativo/escala aberta pelo token. Nunca confiar em URL ou caminho enviado pelo frontend.
5. Fazer upload para objeto privado com caminho gerado pelo servidor e metadados mínimos. Guardar no Postgres somente chave do objeto/URL interna em `ObraEvento.fotoUrl` (preferencialmente evoluir para storageKey e metadados tipados conforme necessidade), nunca os bytes.
6. Evitar evento incompleto: estratégia simples é validar/autorização, subir objeto primeiro, gravar evento em transação e apagar o objeto se o insert falhar. Se a remoção compensatória falhar, registrar tarefa de reconciliação/limpeza. Alternativa é estado pendente de evento com saga/outbox, que exige campos/fluxo adicional. A transação PostgreSQL não inclui atomicamente Storage.
7. Retornar e expor a referência apenas em detalhes/lista da obra após aplicar filtros de autorização. Para bucket privado, gerar URL assinada após checar acesso ou servir por endpoint autenticado.
8. Renderizar imagem com texto alternativo/placeholder e link acessível na timeline compartilhada; preservar filtro do cliente e ocultação de dados financeiros para colaboradores.
9. Implementar limpeza de objetos órfãos/reconciliação e observabilidade sem registrar URLs assinadas ou tokens em logs.

## Dependências e sequência recomendada

### Entrega A — integração sem fotos

- Conectar dashboard a `GET /obras` e detalhes a `GET /obras/:id`; remover mocks exclusivamente usados nas duas telas, mantendo mocks compartilhados por Admin/cliente.
- Conectar registro textual à rota existente, mapear tipos de UI para enum API, manter validação e recarregar detalhes/timeline da API após confirmação.
- Desabilitar/remover preview local de fotos e explicar indisponibilidade. Esta entrega não satisfaz por completo o critério original de foto, portanto a Issue #23 não deve ser marcada concluída enquanto a divergência permanecer.
- Exige apenas frontend e função de serviço frontend; sem mudança de banco/backend se contratos existentes permanecerem.

### Entrega B — upload persistente

- Exige backend: parser/validação de arquivo, integração Storage, autorização, compensação de falhas, formato de retorno, download seguro e testes.
- Exige frontend: seleção real, validação de UX, envio, progresso/erros e renderização da imagem persistida na timeline.
- Prisma: `fotoUrl` e `FOTO` já existem, então o caso mínimo talvez não exija migration. Se precisar guardar `storageKey`, MIME, tamanho, checksum, estado do upload, múltiplas fotos ou metadados, requer alteração no schema e migration, a cargo do responsável autorizado. Revisar também índices e política de retenção.
- Dependência externa obrigatória: projeto Supabase Storage, bucket privado, credenciais/configuração no ambiente de execução, políticas apropriadas e decisão de URLs assinadas. Requer pessoa responsável pelo projeto Supabase; não configurado nesta auditoria.
- Esta parte pode ser separada em Issue própria (ou subissue da #23) para não bloquear a integração textual e para formalizar os requisitos de produto/Storage; a #23 permanece aberta até ambos os critérios exigidos serem satisfeitos ou ter escopo formalmente ajustado.

### Entrega C — números #37/#38/#39/#43/#44

- Não criar cinco telas: os registros identificam consolidação, autenticação, troca de senha e setup/contrato. Reutilizar as funcionalidades já presentes e confirmar com mantenedores se “Incluir as telas novas” significa apenas trazer o conteúdo histórico dessas PRs para esta branch, pois elas já estão refletidas localmente.

## Pendências, riscos e limitações

1. Critério de foto da #23 conflita com a instrução anterior de não implementar armazenamento nesta etapa; não foi tomada decisão de escopo.
2. O texto #23 não informa se foto pode existir sem descrição, tamanho/quantidade/formato máximos ou se todos os eventos devem ser visíveis ao cliente.
3. Supabase Storage, bucket, políticas e credenciais não estão configurados nos arquivos consultados; não se verificou estado do painel externo.
4. O schema permite apenas um `fotoUrl` opcional por evento; múltiplas fotos requerem modelagem adicional ou convenção explícita.
5. Não foram executados testes nesta auditoria, pois o objetivo era levantamento e nenhuma alteração de implementação foi feita.
6. O Git já apresentava alterações pendentes de outras issues; nenhum arquivo de implementação foi tocado.

## Estado do Git e restrições

Foram preservadas as alterações pendentes preexistentes das Issues #21 e #22. Esta auditoria criou/atualizou apenas os relatórios solicitados (`docs/auditoria-complementar-issue-23.md`, `diagnostico.txt`, `docs/resposta-auditoria-issue-23.md`). Nenhum arquivo de implementação, `.env`, schema ou migration foi alterado. Nenhuma migration, `db push`, seed ou reset foi executado. Não houve operação no Supabase, commit, push ou merge. A Issue #24 não foi iniciada.
