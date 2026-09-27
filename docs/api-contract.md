# Contrato de API — ObraMaster

Base URL: `http://localhost:3000`
Autenticação: Bearer Token (JWT) no header `Authorization`, exceto nas rotas de login/registro.

---

## Autenticação

### POST /auth/register
**Descrição:** Cadastra uma nova Empresa e cria automaticamente seu usuário Admin/Dono
**Headers:** `Content-Type: application/json`
**Request Body:**
```json
{
  "nomeEmpresa": "Reformas do Oliveira",
  "nomeUsuario": "Carlos Klebe Caires de Oliveira",
  "email": "carlosklebe@reformasoliveira.com",
  "senha": "senha123"
}
```
**Response 201:**
```json
{
  "empresa": { "id": "...", "nome": "Reformas do Oliveira" },
  "usuario": {
    "id": "...",
    "empresaId": "...",
    "nome": "Carlos Klebe Caires de Oliveira",
    "email": "carlosklebe@reformasoliveira.com",
    "tipo": "ADMIN"
  }
}
```
**Response 400:**
```json
{ "erro": "Campos obrigatórios: nomeEmpresa, nomeUsuario, email, senha" }
```
**Response 409:**
```json
{ "erro": "Já existe um usuário com esse e-mail" }
```

### POST /auth/login
**Descrição:** Autentica um usuário (cliente ou admin)
**Request Body:**
```json
{ "email": "cliente@obramaster.com", "senha": "cliente123" }
```
**Response 200:**
```json
{
  "token": "jwt.token.aqui",
  "usuario": { "id": 1, "nome": "Jaqueline Barros Caires de Oliveira", "tipo": "cliente" }
}
```
**Response 401:**
```json
{ "erro": "Credenciais inválidas" }
```

---

## Gestão de Obras

### GET /obras
**Descrição:** Lista as obras do usuário autenticado
**Headers:** `Authorization: Bearer {token}`
**Nota:** o filtro aplicado depende do tipo de usuário autenticado — Cliente recebe apenas sua própria obra, Colaborador recebe apenas as obras em que foi alocado, Admin recebe todas as obras da empresa.
**Response 200:**
```json
[
  {
    "id": "OBR-1024",
    "titulo": "Reforma do banheiro social",
    "tipo_servico": "Reforma de banheiro",
    "endereco": "Rua das Acácias, 240 — São Paulo/SP",
    "status": "Concluída",
    "valor_total": 11200.00,
    "saldo_pendente": 0.00,
    "data_previsao": "2026-08-05",
    "progresso_percentual": 100
  }
]
```

### POST /obras
**Descrição:** Cria uma nova obra (apenas Admin)
**Headers:** `Authorization: Bearer {token}`
**Request Body:**
```json
{
  "titulo": "Construção de casa",
  "tipo_servico": "Construção",
  "endereco": "Rua Paranapuã, 13 — São Vicente/SP",
  "valor_total": 85000.00,
  "data_previsao": "2027-03-01"
}

```
**Response 201:**
```json
{ "id": "OBR-1031", "status": "Agendada" }
```

### GET /obras/:id
**Descrição:** Detalhe de uma obra, incluindo a linha do tempo de eventos (RN4)
**Headers:** `Authorization: Bearer {token}`
**Response 200:**
```json
{
  "id": "OBR-1024",
  "titulo": "Reforma do banheiro social",
  "status": "Concluída",
  "valor_total": 11200.00,
  "saldo_pendente": 0.00,
  "eventos": [
    {
      "tipo": "status",
      "descricao": "Status alterado para Em andamento",
      "usuario": "admin@obramaster.com",
      "data": "2026-06-10T14:00:00Z"
    },
    {
      "tipo": "pagamento",
      "descricao": "Pagamento de R$ 5.600,00 registrado (1ª parcela)",
      "usuario": "cliente@obramaster.com",
      "data": "2026-06-10T14:05:00Z"
    }
  ]
}
```

### PATCH /obras/:id/status
**Descrição:** Atualiza o status oficial da obra (apenas Admin — RN2: sequência obrigatória Agendada → Em andamento → Concluída, sem retrocesso)
**Headers:** `Authorization: Bearer {token}`
**Request Body:**
```json
{ "status": "Em andamento" }
```
**Response 200:**
```json
{ "id": "OBR-1024", "status": "Em andamento" }
```
**Response 400:**
```json
{ "erro": "Transição de status inválida" }
```
**Response 400 (RN6):**
```json
{ "erro": "Obra não pode ser concluída com pagamento pendente" }
```

---

## Pagamento

### POST /obras/:id/pagamento
**Descrição:** Registra o pagamento de uma parcela (RN1: valor ≤ saldo pendente, sem duplicidade; RN8: parcelas de 50%/50%)
**Headers:** `Authorization: Bearer {token}`
**Request Body:**
```json
{
  "valor": 5600.00,
  "metodo": "pix",
  "transacao_mercadopago_id": "MP-8827364"
}
```
**Response 201:**
```json
{ "id": "PAG-501", "saldo_pendente": 5600.00 }
```
**Response 400 (RN1):**
```json
{ "erro": "Valor do pagamento excede o saldo pendente" }
```

---

## Andamento

### POST /obras/:id/andamento
**Descrição:** Registra foto e/ou anotação de progresso (Colaborador). Vira um evento na linha do tempo (RN4)
**Headers:** `Authorization: Bearer {token}`
**Request Body:** `multipart/form-data`
```
foto: (arquivo de imagem)
anotacao: "Instalação do piso concluída"
```
**Response 201:**
```json
{
  "id": "EVT-207",
  "url_foto": "https://res.cloudinary.com/obramaster/evt-207.jpg",
  "anotacao": "Instalação do piso concluída",
  "usuario": "colaborador@obramaster.com",
  "data": "2026-07-02T09:30:00Z"
}
```

---

## Tabela de Preços

### GET /precos
**Descrição:** Lista a tabela de preços da empresa autenticada
**Headers:** `Authorization: Bearer {token}`
**Response 200:**
```json
[
  { "id": 1, "servico": "Reforma de banheiro (m²)", "valor": 450.00 },
  { "id": 2, "servico": "Construção nova (m²)", "valor": 1800.00 }
]
```

### POST /precos
**Descrição:** Cadastra um novo serviço na tabela de preços (apenas Admin)
**Headers:** `Authorization: Bearer {token}`
**Request Body:**
```json
{ "servico": "Pintura interna (m²)", "valor": 35.00 }
```
**Response 201:**
```json
{ "id": 3, "servico": "Pintura interna (m²)", "valor": 35.00 }
```


---

> **Pendente:** fluxo de cadastro/convite do Cliente (Admin cadastra o cliente e envia link de ativação por e-mail) ainda não tem rota definida — a criar em issue futura.