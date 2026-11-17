# Contrato da API — Backend ObraMaster

Base URL: `http://localhost:3000`. Rotas protegidas exigem `Authorization: Bearer <token>`.
Os papéis válidos são `ADMIN`, `CLIENTE` e `COLABORADOR`.

## Rotas implementadas

| Método e rota | Acesso | Comportamento |
|---|---|---|
| `GET /` | Público | Mensagem de disponibilidade. |
| `GET /health` | Público | Informa se o processo está ativo e se `DATABASE_URL` está definida; não testa conexão ao banco. |
| `POST /auth/login` | Público | Recebe `{ "email", "senha" }`; retorna JWT válido por 8 horas e perfil básico. |
| `GET /auth/me` | Autenticado | Retorna o perfil atual do usuário. |
| `GET /usuarios` | ADMIN | Lista usuários da empresa do token, sem hashes de senha. |
| `POST /colaboradores` | ADMIN | Cria colaborador na empresa do token. Recebe `nome`, `email` e `senha`. |
| `POST /obras` | ADMIN | Cria obra na empresa do token. Recebe `nome` e, opcionalmente, `descricao` e `endereco`. |
| `GET /obras` | Autenticado | Lista obras dentro do escopo do perfil. |
| `GET /obras/:id` | Autenticado | Consulta obra dentro do escopo; obra inexistente ou fora dele retorna 404. |
| `PATCH /obras/:id/agendamento` | ADMIN da empresa | Confirma novo intervalo sem conflito e registra evento de agenda visível ao cliente. |
| `POST /obras/:id/conclusao/solicitar` | ADMIN da empresa | Envia obra em andamento para conferência; status, data e evento de timeline são persistidos em transação. |
| `POST /obras/:id/conclusao/confirmar` | CLIENTE proprietário | Confirma obra aguardando conferência; status, data e evento são persistidos em transação. |
| `POST /obras/:id/andamento` | COLABORADOR alocado | Registra anotação/update/ocorrência na timeline. Upload de foto retorna 501 enquanto não houver armazenamento configurado. |
| `POST /obras/:id/pagamento` | CLIENTE proprietário | Cria uma tentativa pendente e retorna a URL do Checkout Pro sandbox. Requer `Idempotency-Key`; a criação do checkout não quita a parcela. |
| `POST /obras/:id/pagamentos/:pagamentoId/retomar` | CLIENTE proprietário | Retoma tentativa persistida `PENDENTE` sem chave idempotente no cliente; retorna checkout existente ou repete a criação pela referência estável. |
| `POST /webhooks/mercado-pago` | Webhook público com assinatura HMAC | Valida a notificação de Order, consulta a Order na API Mercado Pago e só então persiste o estado confirmado. |
| `PATCH /usuarios/me/senha` | Autenticado | Troca a própria senha com `senhaAtual` e `novaSenha`; aceita também nomes snake_case. |

Login retorna 400 para campos ausentes, 401 para credenciais inválidas e 503 quando o banco não está configurado. Cada requisição autenticada valida o JWT e confere o usuário, e-mail, papel e empresa atuais no banco. Tokens deixam de valer após remoção do usuário ou alteração de e-mail, papel ou empresa.

## Escopo e formato das obras

- `ADMIN` recebe todas as obras da empresa do token.
- `CLIENTE` recebe somente obras cujo `clienteId` corresponde ao próprio usuário.
- `COLABORADOR` recebe somente obras com escala aberta de funcionário associado ao usuário e à mesma empresa.
- `valorTotal` e parcelas são enviados a `ADMIN` e `CLIENTE`, e omitidos para `COLABORADOR`.
- `CLIENTE` recebe eventos com `visivelParaCliente: true`. `COLABORADOR` não recebe eventos `pagamento`, `orcamento_aprovado` ou `contratacao`, em linha com o filtro de timeline usado no frontend.
- Eventos, funcionários escalados e cliente de outra empresa não devem aparecer na resposta.

O objeto de obra usa os campos `id`, `titulo`, `cliente`, `colaboradores`, `endereco`, `status`, `prazo`, `timeline` e, conforme o perfil, `valorTotal`, `parcela1` e `parcela2`. Datas usam `DD/MM/YYYY`; horários usam `HH:mm`. O schema não possui vencimento de parcela, portanto parcelas pendentes retornam `vencimento: null`. O formato atual expõe no máximo duas parcelas.

## Ainda não implementado

Cadastro/convite de clientes, alteração genérica de status, upload de fotos e rotas de tabela de preços pertencem ao escopo planejado do produto. Solicitação e confirmação de conclusão são operações explícitas descritas abaixo. O endpoint de andamento registra eventos textuais; fotos dependem de armazenamento persistente ainda não configurado. O checkout usa sandbox e depende de credenciais e webhook público para validação fim a fim.

### Conclusão e RN8 — Issue #22

`POST /obras/:id/conclusao/solicitar` aceita somente ADMIN da empresa e somente quando a obra está `EM_ANDAMENTO`; grava `AGUARDANDO_CONFERENCIA`, `conclusaoSolicitadaEm` e evento visível ao cliente na mesma transação. Repetições ou status incompatíveis retornam 409.

`POST /obras/:id/conclusao/confirmar` aceita somente CLIENTE proprietário da obra, dentro da empresa autenticada, e somente em `AGUARDANDO_CONFERENCIA`; grava `CONCLUIDA`, `conclusaoConfirmadaEm` e evento visível na mesma transação. Obra fora do escopo retorna 404; status incompatível ou repetição retorna 409. A segunda parcela é validada no backend em toda tentativa nova: requer `CONCLUIDA` e confirmação persistida. A tela não altera status de parcelas; somente o webhook assinado e consultado no Mercado Pago registra aprovação.

### Agendamento/reagendamento — Issue #19

`PATCH /obras/:id/agendamento` exige token de `ADMIN`. A obra é localizada dentro da empresa do usuário autenticado; empresa e administrador não são aceitos pelo payload. Entrada:

```json
{
  "agendadaPara": "2026-12-01T09:00:00.000Z",
  "prazoFinal": "2026-12-01T12:00:00.000Z"
}
```

Os dois campos devem ser timestamps ISO 8601 válidos com fuso horário e `prazoFinal` deve ser posterior ao início. O backend procura intervalos completos de outras obras da mesma empresa com a condição `inicioExistente < fimSolicitado && fimExistente > inicioSolicitado`. Limites que apenas se tocam são permitidos; a própria obra e obras `CONCLUIDA` são excluídas da busca. Obra sem algum dos limites não reserva intervalo.

Sucesso retorna HTTP 200 com `{ "obra": { ...obra, "agendadaPara": "...Z", "prazoFinal": "...Z" }, "evento": { ... }, "alterada": true }`. Repetir exatamente o intervalo já confirmado retorna HTTP 200, `alterada: false` e `evento: null`, sem inserir outro evento. Conflito de horário retorna HTTP 409 com mensagem explícita. Payload inválido retorna 400, usuário sem autenticação 401, papel ou ausência de empresa 403 e obra inexistente ou fora da empresa 404.

A confirmação e o evento `AGENDAMENTO` são gravados na mesma transação. O evento identifica obra, empresa e administrador, é visível ao cliente na timeline e descreve os novos limites em UTC. Reagendamentos da mesma empresa usam advisory lock transacional por empresa e isolamento Serializable, com retry limitado de conflitos Prisma `P2034`; isso reduz disputas entre requisições concorrentes sem depender do frontend.

O enum atual `StatusObra` contém `CONCLUIDA`, mas não contém estado `CANCELADA`; portanto, não foi inventado um estado novo. Se o modelo receber um estado de cancelamento em outra entrega, ele deve ser excluído da busca de conflito conforme a regra de negócio.

### Registro de andamento

`POST /obras/:id/andamento` exige `Authorization: Bearer <token>` de um usuário `COLABORADOR` que tenha uma escala aberta na obra. Exemplo de entrada:

```json
{
  "tipo": "ANOTACAO",
  "descricao": "Alvenaria do primeiro pavimento concluída."
}
```

`tipo` é opcional e assume `ATUALIZACAO`; os valores aceitos são `ANOTACAO`, `ATUALIZACAO` e `OCORRENCIA`. `descricao` é obrigatória e limitada a 2000 caracteres. Sucesso retorna HTTP 201 com `{ "evento": { ... } }`; o evento é persistido com autor, empresa, timestamp e `visivelParaCliente: true`. Usuário sem alocação aberta recebe 403, obra inexistente ou de outra empresa recebe 404 e payload inválido recebe 400.

O backend não possui SDK, credenciais ou bucket de armazenamento. Enviar `foto`, `fotoUrl` ou `multipart/form-data` retorna HTTP 501 sem persistir evento parcial. Para completar foto, configurar armazenamento persistente (por exemplo, Supabase Storage) e definir bucket privado/público, política de acesso e estratégia de URL antes de implementar o upload.

### Pagamento de parcela — Issue #18

`POST /obras/:id/pagamento` exige token de `CLIENTE` e que a obra pertença ao usuário autenticado e à empresa do token. O corpo contém `parcelaId` e `valor`; a chave única da tentativa vai no cabeçalho `Idempotency-Key`. A segunda parcela exige que o status persistido seja `CONCLUIDA` e `conclusaoConfirmadaEm` esteja preenchido. Exemplo:

```http
Authorization: Bearer <token>
Idempotency-Key: 8f37f406-dc1c-4b46-9dc1-1ea6286b72c9
Content-Type: application/json
```

```json
{
  "parcelaId": "uuid-da-parcela",
  "valor": 250.00
}
```

O backend valida valor positivo com até duas casas decimais, obra, parcela e saldo persistido. Tentativas pendentes reservam saldo; aprovações e pagamentos parciais são somados em centavos, e a parcela só muda para `PAGA` quando o total confirmado cobre seu valor. A chave idempotente não pode ser reutilizada com dados diferentes. Cada order do provedor recebe o ID local como `external_reference` e `X-Idempotency-Key`; IDs externos têm índices únicos no banco.

Uma nova solicitação retorna HTTP 201 com `{ "pagamento": { "id", "status": "PENDENTE", ... }, "checkoutUrl": "https://www.mercadopago.com.br/..." }`. A mesma solicitação repetida retorna HTTP 200 com a tentativa e o checkout já criados. Erros esperados: 400 (payload ou chave inválidos), 401 (sem autenticação), 403 (papel não permitido), 404 (obra/parcela fora do escopo do cliente), 409 (saldo insuficiente, concorrência ou idempotência conflitante), 502 (falha do provedor) e 503 (banco ou configuração sandbox ausente).

`POST /obras/:id/pagamentos/:pagamentoId/retomar` exige token de `CLIENTE`. A busca restringe simultaneamente o ID da tentativa, ID da obra, ID do cliente autenticado e empresa da obra igual à empresa autenticada, e só permite estado `PENDENTE`. Não recebe empresa, valor nem chave idempotente do navegador e não cria uma segunda reserva. Se o checkout estiver persistido, devolve a mesma URL sem exigir Access Token do Mercado Pago; se a criação anterior falhou antes de persistir a URL, exige a configuração sandbox e o provedor recebe novamente o mesmo ID local como referência e chave idempotente. Tentativas aprovadas, recusadas, canceladas ou encerradas (`ERRO`) retornam 409; IDs de outra obra/cliente/empresa retornam 404. A resposta nunca contém a chave idempotente ou credenciais.

O retorno do navegador não confirma pagamento. A URL configurada deve receber notificações de Orders (`type=order`). O endpoint `POST /webhooks/mercado-pago` valida `x-signature` e `x-request-id`, usa `data.id` para consultar `GET /v1/orders/{id}` com o Access Token de teste e processa apenas os dados dessa resposta autenticada no provedor. Uma Order `processed` só aprova se tiver uma transação processada identificada e os valores pagos corresponderem ao valor local. Estados pendentes, recusados ou cancelados nunca quitam parcela. A Order, a referência local, a moeda BRL, o valor e o identificador único da transação são verificados antes da gravação.

Configuração manual necessária (não gravar credenciais no repositório): definir `MERCADO_PAGO_ACCESS_TOKEN_TEST` com Access Token de teste e `MERCADO_PAGO_WEBHOOK_SECRET` com a assinatura secreta de Webhooks. No painel de integrações, cadastrar URL HTTPS pública do webhook no modo de teste e habilitar notificações de Orders. A URL local não alcançável pela internet não recebe callbacks. O checkout usa Orders API do Checkout Pro, que retorna `checkout_url` e aceita `X-Idempotency-Key` para repetição segura ([criação de order](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-orders/create-order?scope=prod)); as notificações de Orders e a forma de consulta estão descritas pelo provedor ([notificações Checkout Pro Orders](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-orders/notifications?scope=prod)).

A aprovação real no sandbox ainda não foi validada: não há credenciais de teste nem URL pública de webhook configuradas neste ambiente. Testes mockados não substituem a compra aprovada real. A migration aditiva que cria o histórico de tentativas ainda precisa ser aplicada em ambiente autorizado antes do endpoint funcionar com PostgreSQL.
