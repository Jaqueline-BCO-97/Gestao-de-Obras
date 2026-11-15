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

Cadastro/convite de clientes, alteração de status, pagamentos, andamento e upload de fotos, agendamentos e rotas de tabela de preços pertencem ao escopo planejado do produto, mas não existem como endpoints no backend atual.
