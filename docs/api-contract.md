# Contrato de API — ObraMaster

Base URL: `http://localhost:3333/api`
Autenticação: Bearer Token (JWT) no header `Authorization`, exceto nas rotas de login/registro.

---

## Autenticação

### POST /auth/register
**Descrição:** Cadastra um novo cliente
**Headers:** `Content-Type: application/json`
**Request Body:**
```json
{
  "nome": "Ana Beatriz Souza",
  "email": "ana@email.com",
  "senha": "senha123",
  "telefone": "(11) 98888-1234"
}
```
**Response 201:**
```json
{ "id": 1, "nome": "Ana Beatriz Souza", "email": "ana@email.com" }
```
**Response 400:**
```json
{ "error": "E-mail já cadastrado" }
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
  "usuario": { "id": 1, "nome": "Ana Beatriz Souza", "tipo": "cliente" }
}
```
**Response 401:**
```json
{ "error": "Credenciais inválidas" }
```

---

## Gestão de Obras

### GET /obras
**Descrição:** Lista as obras do usuário autenticado
**Headers: