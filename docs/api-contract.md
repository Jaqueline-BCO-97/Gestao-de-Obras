# Contrato da API — Backend ObraMaster

Base URL: `http://localhost:3000`. Rotas protegidas exigem `Authorization: Bearer <token>`.
Os papéis válidos são `ADMIN`, `CLIENTE` e `COLABORADOR`.

## Rotas implementadas

| Método e rota | Acesso | Comportamento |
|---|---|---|
| `GET /` | Público | Mensagem de disponibilidade. |
| `GET /health` | Público | Informa se o processo está ativo e se `DATABASE_URL` está definida; não testa conexão ao banco. |
| `POST /auth/login` | Público | Recebe `{ "email", "senha" }`; retorna JWT válido por 8 horas e perfil básico. |
| `POST /auth/registro-empreiteira` | Público | Recebe os dados da empresa e do administrador; `slogan`, `estado`, `cidade`, `bairro`, `numero` e `complemento` são opcionais para manter compatibilidade. |
| `GET /auth/me` | Autenticado | Retorna o perfil atual do usuário; para ADMIN inclui nome, slogan e endereço da empresa. |
| `PATCH /usuarios/me` | Autenticado | Atualiza dados do perfil; ADMIN pode enviar `empresa.slogan` e os campos de endereço da empresa. |
| `GET /usuarios` | ADMIN | Lista usuários da empresa do token, sem hashes de senha. |
| `POST /colaboradores` | ADMIN | Cria colaborador na empresa do token. Recebe `nome`, `email` e `senha`. |
| `POST /obras` | ADMIN | Cria obra na empresa do token. Recebe `nome` e, opcionalmente, `descricao` e `endereco`. |
| `PATCH /obras/:id` | ADMIN da empresa | Atualiza dados gerais; se receber `vencimentoInicial`, aplica a mesma regra transacional da rota dedicada de vencimento. |
| `PATCH /obras/:id/vencimento` | ADMIN da empresa | Atualiza somente `Parcela.vencimento` de todas as parcelas a partir da data informada; exige obra Agendada e sem movimento de pagamento. |
| `GET /obras` | Autenticado | Lista obras dentro do escopo do perfil. |
| `GET /obras/:id` | Autenticado | Consulta obra dentro do escopo; obra inexistente ou fora dele retorna 404. |
| `POST /obras/:id/colaboradores` | ADMIN da empresa | Recebe `funcionarioId` e adiciona uma escala aberta sem encerrar as escalas anteriores; valida empresa, nível Responsável, funcionário ativo, vínculo de login válido, duplicidade e função repetida. |
| `PATCH /obras/:id/colaboradores/:alocacaoId` | ADMIN da empresa | Encerra a escala aberta sem apagar o histórico. |
| `POST /obras/:id/colaboradores/:alocacaoId/mover` | ADMIN da empresa | Transfere uma escala da obra de origem para uma obra destino válida da mesma empresa. |
| `PATCH /obras/:id/agendamento` | ADMIN da empresa | Recebe datas, permite períodos sobrepostos e registra evento visível ao cliente. |
| `POST /obras/:id/conclusao/solicitar` | ADMIN da empresa | Envia obra em andamento para conferência; status, data e evento de timeline são persistidos em transação. |
| `POST /obras/:id/conclusao/confirmar` | CLIENTE proprietário | Confirma obra aguardando conferência; status, data e evento são persistidos em transação. |
| `POST /obras/:id/andamento` | COLABORADOR alocado ou ADMIN da empresa | Registra anotação/update/ocorrência e foto opcional na timeline; o ADMIN pode controlar a visibilidade ao cliente. |
| `POST /obras/:id/pagamento` | CLIENTE proprietário | Cria uma tentativa pendente e retorna a URL do Checkout Pro sandbox. Requer `Idempotency-Key`; a criação do checkout não quita a parcela. |
| `POST /obras/:id/pagamentos/:pagamentoId/retomar` | CLIENTE proprietário | Retoma tentativa persistida `PENDENTE` sem chave idempotente no cliente; retorna checkout existente ou repete a criação pela referência estável. |
| `POST /webhooks/mercado-pago` | Webhook público com assinatura HMAC | Valida a notificação de Order, consulta a Order na API Mercado Pago e só então persiste o estado confirmado. |
| `PATCH /usuarios/me/senha` | Autenticado | Troca a própria senha com `senhaAtual` e `novaSenha`; aceita também nomes snake_case. |

Login retorna 400 para campos ausentes, 401 para credenciais inválidas e 503 quando o banco não está configurado. Cada requisição autenticada valida o JWT e confere o usuário, e-mail, papel e empresa atuais no banco. Tokens deixam de valer após remoção do usuário ou alteração de e-mail, papel ou empresa.

## Escopo e formato das obras

- `ADMIN` recebe todas as obras da empresa do token.
- `CLIENTE` recebe somente obras cujo `clienteId` corresponde ao próprio usuário.
- `COLABORADOR` recebe somente obras com escala aberta de funcionário associado ao usuário e à mesma empresa.
- `valorTotal`, parcelas e `resumoParcelas` são enviados a `ADMIN` e `CLIENTE`, e omitidos para `COLABORADOR` (regra RN15).
- `CLIENTE` recebe eventos com `visivelParaCliente: true`. `COLABORADOR` não recebe eventos `pagamento`, `orcamento_aprovado` ou `contratacao`, em linha com o filtro de timeline usado no frontend.
- As parcelas podem incluir `temMovimentoPagamento` (booleano somente leitura), que informa se existe pagamento em qualquer estado, parcela paga, comprovante enviado ou referência externa; o campo não expõe os detalhes de pagamentos ocultos.

### Atribuição de gerentes

`POST /obras/:id/colaboradores` adiciona uma escala e registra evento de equipe; não encerra escalas anteriores. Só ADMIN pode chamar a rota. A função repetida é comparada removendo acentos, juntando espaços internos repetidos, removendo espaços das pontas e ignorando caixa (`pt-BR`); a função salva e exibida permanece com o texto original do cadastro. A tela de Gerentes lista obras não arquivadas com status Agendada, Em andamento ou Aguardando conferência, oculta Concluída no frontend e não apresenta valores financeiros nessa lista. A regra de status da tela não muda o comportamento da API de atribuição.
- Eventos, funcionários escalados e cliente de outra empresa não devem aparecer na resposta.

O objeto de obra usa os campos `id`, `titulo`, `cliente`, `colaboradores`, `endereco`, `status`, `prazo`, `timeline` e, conforme o perfil, `valorTotal`, `parcela1`, `parcela2`, `parcelas` e `resumoParcelas`. Na listagem `GET /obras`, `resumoParcelas` (somente leitura) traz `{ total, pagas, valorParcelaBase, ultimaPaga, penultimaPaga, proximaNaoPaga }` com `{ numero, valor, situacao, estado }` calculado a partir de todas as parcelas da obra usando a mesma regra de atraso do sistema, permitindo exibir cartões de obras com mais de 2 parcelas sem alterar o campo `parcelas`. Datas usam `DD/MM/YYYY`; horários usam `HH:mm`. O schema possui `Parcela.vencimento`, usado para classificar parcelas não pagas vencidas como atrasadas; o campo `vencimento` aparece formatado nas parcelas quando informado. O formato atual legado de `parcela1`/`parcela2` expõe até duas parcelas para compatibilidade.

### Alteração do vencimento das parcelas

`PATCH /obras/:id/vencimento` exige token de `ADMIN` da empresa proprietária e recebe `{ "vencimentoInicial": "AAAA-MM-DD" }`. A obra é localizada pelo ID e pela empresa da sessão; uma obra ausente ou de outra empresa retorna 404 sem revelar sua existência. Cliente e colaborador/gerente recebem 403.

A alteração só é permitida quando o status salvo da obra é `AGENDADA` e nenhuma parcela tem movimento de pagamento. Conta como movimento uma parcela `PAGA`, um comprovante enviado, uma referência externa ou qualquer registro relacionado de `Pagamento`, independentemente do estado. A validação ocorre na mesma transação serializável que atualiza as datas. Fora da regra, a rota responde 409 com: `Só é possível alterar o vencimento enquanto a obra não começou e nenhuma parcela tiver pagamento.`

A rota altera exclusivamente `Parcela.vencimento` em todas as parcelas. Os vencimentos seguem mês a mês a regra atual de preservar o dia de origem e limitar ao último dia de meses curtos (por exemplo, 31 de janeiro, 28/29 de fevereiro e 31 de março). Valores, juros, total e quantidade não são recalculados. O campo deve estar no formato `AAAA-MM-DD` e usa a mesma validação do cadastro de obra; não há validação que impeça datas passadas.

O evento de histórico usa descrição própria e fica visível ao cliente. Uma notificação é criada somente se houver cliente vinculado, e seu conteúdo contém apenas a data anterior e a nova. A alteração invalida o cache das listas da empresa para que o resumo de parcelas e o painel do cliente leiam as datas novas.

O PATCH genérico `PATCH /obras/:id` continua aceitando `vencimentoInicial` para compatibilidade e aplica a mesma validação, função de domínio, transação e bloqueio da rota dedicada. Ao alterar a quantidade em uma operação posterior, as datas são recalculadas a partir do vencimento atual da parcela 1. Convites pendentes com `Convite.vencimentoInicial` legado não são modificados: ao aceitar convite, a data salva atualmente na parcela 1 da obra continua tendo prioridade, e a data antiga do convite permanece apenas como reserva de compatibilidade.

## Cadastro e perfil da empresa

`POST /auth/registro-empreiteira` aceita, além dos campos existentes, os campos opcionais `slogan`, `estado`, `cidade`, `bairro`, `numero` e `complemento`. A interface de cadastro exige os campos do endereço completo, mas integrações antigas podem continuar omitindo-os. O campo `slogan` também pode ser alterado por ADMIN em `PATCH /usuarios/me`, dentro do objeto `empresa`. `GET /auth/me` retorna o slogan e os dados de endereço da empresa para ADMIN.

## Ainda não implementado

alteração genérica de status, upload de fotos e rotas de tabela de preços pertencem ao escopo planejado do produto. Solicitação e confirmação de conclusão são operações explícitas descritas abaixo. O endpoint de andamento registra eventos textuais; fotos dependem de armazenamento persistente ainda não configurado. O checkout usa sandbox e depende de credenciais e webhook público para validação fim a fim.

### Conclusão e RN8 — Issue #22

`POST /obras/:id/conclusao/solicitar` aceita somente ADMIN da empresa e somente quando a obra está `EM_ANDAMENTO`; grava `AGUARDANDO_CONFERENCIA`, `conclusaoSolicitadaEm` e evento visível ao cliente na mesma transação. Repetições ou status incompatíveis retornam 409.

`POST /obras/:id/conclusao/confirmar` aceita somente CLIENTE proprietário da obra, dentro da empresa autenticada, e somente em `AGUARDANDO_CONFERENCIA`; grava `CONCLUIDA`, `conclusaoConfirmadaEm` e evento visível na mesma transação. Obra fora do escopo retorna 404; status incompatível ou repetição retorna 409. A segunda parcela é validada no backend em toda tentativa nova: requer `CONCLUIDA` e confirmação persistida. A tela não altera status de parcelas; somente o webhook assinado e consultado no Mercado Pago registra aprovação.

### Agendamento/reagendamento — Issue #19

`PATCH /obras/:id/agendamento` exige token de `ADMIN`. A obra é localizada dentro da empresa do usuário autenticado; empresa e administrador não são aceitos pelo payload. Entrada:

```json
{
  "agendadaPara": "2026-12-01",
  "prazoFinal": "2026-12-04"
}
```

Obras em qualquer status diferente de `AGENDADA` não podem alterar `agendadaPara`; o início recebido deve ser igual ao salvo para permitir mudança apenas de `prazoFinal`. Os dois campos devem ser datas válidas no formato `AAAA-MM-DD` e `prazoFinal` deve ser posterior ao início. Horários não são solicitados nem exibidos. Períodos de obras diferentes podem ter datas iguais ou se sobrepor, sem bloqueio por conflito.

Sucesso retorna HTTP 200 com `{ "obra": { ...obra, "agendadaPara": "AAAA-MM-DD", "prazoFinal": "AAAA-MM-DD" }, "evento": { ... }, "alterada": true }`. Repetir exatamente as datas já salvas retorna HTTP 200, `alterada: false` e `evento: null`, sem inserir outro evento. Payload inválido retorna 400, usuário sem autenticação 401, papel ou ausência de empresa 403 e obra inexistente ou fora da empresa 404. Falha de concorrência após novas tentativas retorna HTTP 409.

As novas datas e o evento `AGENDAMENTO` são gravados na mesma transação. O evento identifica obra, empresa e administrador, é visível ao cliente na timeline e descreve o período no formato brasileiro. A transação usa isolamento Serializable e repete conflitos Prisma `P2034` até três tentativas.

### Registro de andamento

`POST /obras/:id/andamento` aceita `COLABORADOR` com escala aberta na obra ou `ADMIN` da empresa. Retorna `{ "evento", "timeline" }` com a linha do tempo atualizada e filtrada conforme o perfil. Exemplo de entrada textual:

```json
{
  "tipo": "ANOTACAO",
  "descricao": "Alvenaria do primeiro pavimento concluída."
}
```

`tipo` é opcional e assume `ATUALIZACAO`; os valores aceitos são `ANOTACAO`, `ATUALIZACAO` e `OCORRENCIA`. `descricao` é obrigatória e limitada a 2000 caracteres. Sucesso retorna HTTP 201 com `{ "evento": { ... } }`; o evento é persistido com autor, empresa, timestamp e `visivelParaCliente: true`. Usuário sem alocação aberta recebe 403, obra inexistente ou de outra empresa recebe 404 e payload inválido recebe 400.

Para anexar foto, inclua `foto: { "data": "data:image/jpeg;base64,...", "mimeType": "image/jpeg" }`. São aceitos JPG, PNG e WebP até 5 MB. O servidor valida tipo e tamanho, assina o envio ao Cloudinary e persiste apenas a URL HTTPS retornada pelo provedor. URL enviada pelo navegador é rejeitada. Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` fora do repositório; sem configuração, o endpoint retorna 503. O ADMIN pode definir `visivelParaCliente` booleano; para COLABORADOR o evento sempre fica visível ao cliente. Respostas incluem `fotoUrl` quando houver arquivo.

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


### Funcionários e convite de cliente

`GET /funcionarios` retorna dias programados agrupados por obra e `horarioInicio` em `HH:MM` ou `null` para escalas antigas. `POST /funcionarios` e `PATCH /funcionarios/:id` aceitam `disponibilidades` como lista de `{ obraId, diasSemana, horarioInicio? }`. A lista pode ficar vazia, uma obra pode ter zero ou um dia, e registros antigos sem horário continuam válidos. Quando o mesmo dia aparece em obras diferentes, cada obra precisa de horário entre `07:00` e `17:59`. O mesmo funcionário não pode iniciar em obras diferentes no mesmo dia e horário exatos; horários distintos são permitidos, sem cálculo de sobreposição por duração. Horários inválidos, incompletos para dias repetidos ou conflitantes retornam 400.

`POST /convites/cliente` exige uma obra sem cliente, dados do cliente, uma parcela número 1 com `Parcela.vencimento` e contrato PDF. Não exige `vencimentoInicial`; qualquer data enviada por integrações antigas é ignorada porque a obra define seu próprio calendário. `quantidadeParcelas` continua opcional para compatibilidade com integrações legadas. Convites novos usam a quantidade, o total e os vencimentos já salvos na obra; isso também vale quando uma conta de cliente existente é vinculada a outra obra, preservando calendários separados. Convites antigos aceitos após a mudança priorizam a data da parcela 1 da obra e usam `Convite.vencimentoInicial` somente como reserva se a obra não tiver data. Se nem a obra nem o convite antigo tiverem vencimento, a criação retorna 400 e o aceite legado retorna 409; nenhum convite novo é gerado e nenhuma parcela é criada sem data. Convites legados com quantidade continuam usando o fluxo anterior de cálculo. Um convite para obra já vinculada retorna 409, e a aceitação também protege o vínculo contra concorrência.

`POST /convites/gerente` aceita `obraId` opcional e `funcao` como texto obrigatório de até 100 caracteres, aparado nas pontas. Quando `obraId` é informado, a obra precisa pertencer à empresa do administrador. `GET /convites/:token` retorna tipo, nome convidado, empresa, obra e estado do convite; para gerente também inclui `funcao` e mantém o campo `email` completo por compatibilidade. A obra pode ser `null` em convite de gerente. `POST /convites/:id/reenviar` continua gerando um link novo sem depender de obra vinculada. Para cliente, `GET /convites/:token` não retorna o e-mail completo e inclui somente `emailDica`; o domínio fica visível e a parte local sempre usa seis asteriscos: com 6 ou mais caracteres mostra também as duas primeiras e as duas últimas letras, com 3 a 5 mostra só a primeira, e com 1 ou 2 não revela letras. Para cliente sem sessão, `POST /convites/:token/aceitar` exige `email` e `senha`. E-mail ausente ou vazio retorna 400 com `EMAIL_CONVITE_OBRIGATORIO`; e-mail divergente retorna 400 com `EMAIL_CONVITE_DIVERGENTE` e mensagem que não revela o endereço convidado. A comparação remove espaços nas pontas e ignora maiúsculas e minúsculas, antes da transação. Senhas novas por convite, tanto para cliente quanto gerente sem sessão, exigem 8 ou mais caracteres, uma letra maiúscula, um número e um caractere que não seja letra nem número; cada regra retorna um código `SENHA_*` e mensagem próprios. Aceitar convite de gerente sem obra cria ou ativa a conta de colaborador Responsável sem escala, evento ou notificação de obra, permitindo login com lista de obras vazia. Usuários com sessão não criam senha nova; login e senhas já existentes não mudam. Convites usados ou expirados continuam retornando 410. Convites novos seguem usando quantidade, total, vencimento e contrato conforme as regras acima.
