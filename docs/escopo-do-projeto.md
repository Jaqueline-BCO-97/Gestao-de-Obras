# Escopo e estado do MVP

Este documento descreve o estado do projeto nesta branch de revisão do PR #78. A `main` não inclui as alterações ainda não mescladas.

## Implementado no código

- Autenticação por perfil e isolamento de obras por empresa; colaborador inativo ou sem vínculo válido é bloqueado.
- Alocação e encerramento de escalas com histórico, autor da mudança e consulta restrita a ADMIN.
- Reagendamento com checagem transacional de conflito; o evento visível aparece como aviso no painel e no detalhe do cliente.
- Registro de andamento por colaborador alocado ou ADMIN, com texto, visibilidade controlada pelo ADMIN e foto opcional enviada ao Cloudinary.
- Cliente consulta obras e timeline filtrada, solicita/confirmar conclusão e acompanha pagamentos.
- Checkout Pro Orders com idempotência, retomada de tentativas e webhook que verifica assinatura e consulta a Order no provedor.

## Validação pendente de ambiente

- Upload real requer `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET`.
- Aprovação real no Mercado Pago requer Access Token de teste, segredo do webhook, URL HTTPS pública e migration aplicada em banco de teste.
- As suítes automatizadas usam mocks; não substituem esses dois testes de integração.

## Fora desta entrega

- Cadastro/convite de clientes, tabela de preços e calendário administrativo integrados.
- Telas dedicadas de funcionário, gestão detalhada de obra, contratos PDF e auditoria/notificações para todos os eventos.
- Publicação, teste em múltiplos dispositivos e fechamento de issues dependentes dessas funcionalidades.

## Comandos de validação automatizada

```bash
npm --prefix backend test
node --test frontend/tests/*.test.js
npm --prefix frontend run lint
npm --prefix frontend run build
```

O teste de troca de senha (`backend/tests/trocaSenha.test.js`) grava registros temporários. Execute-o apenas com uma base isolada, nunca contra produção ou um banco compartilhado.
