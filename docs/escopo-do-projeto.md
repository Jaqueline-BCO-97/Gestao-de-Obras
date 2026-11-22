# Escopo e estado do MVP

Este documento descreve o estado do projeto nesta branch de revisão do PR #78. A `main` não inclui as alterações ainda não mescladas.

## Implementado no código

- ObraMaster é apresentado como sistema de gestão de obras da empreiteira; o cadastro inicial cria a empresa e sua conta administradora, sem intermediar contratação de empreiteiras ou profissionais.
- A empreiteira pode cadastrar uma obra e emitir convite individual, válido por 48 horas, para cliente (dashboard de acompanhamento) ou gerente (perfil colaborador responsável com acesso àquela obra).
- O token do convite é armazenado como hash e aceito uma única vez; os links pendentes podem ser renovados, o gerente só recebe escala na obra convidada e a empreiteira pode consultar e encerrar as escalas ativas.
- As telas de Clientes e Gerentes mostram os vínculos existentes e os convites pendentes; como não há serviço de e-mail configurado, a empreiteira copia e envia os links manualmente.
- Autenticação por perfil e isolamento de obras por empresa; colaborador inativo ou sem vínculo válido é bloqueado.
- Alocação e encerramento de escalas com histórico, autor da mudança e consulta restrita a ADMIN.
- Reagendamento por datas, sem solicitar ou exibir horários; obras podem ter períodos sobrepostos. O evento visível aparece como aviso no painel e no detalhe do cliente.
- Registro de andamento por colaborador alocado ou ADMIN, com texto, visibilidade controlada pelo ADMIN e foto opcional enviada ao Cloudinary.
- Cliente consulta obras e timeline filtrada, solicita/confirmar conclusão e acompanha pagamentos.
- Checkout Pro Orders com idempotência, retomada de tentativas e webhook que verifica assinatura e consulta a Order no provedor.
- A confirmação do cliente libera a segunda parcela; a obra só muda para Concluída depois que todas as parcelas estiverem pagas.
- O detalhe administrativo permite editar dados básicos da obra, iniciar execução, solicitar conferência, registrar atualizações com visibilidade e consultar equipe e histórico de acesso.
- A empreiteira pode cadastrar e editar preços de referência, ver a agenda e agendar ou reagendar obras; a sobreposição de períodos é permitida.

## Validação pendente de ambiente

- Upload real requer `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET`.
- Aprovação real no Mercado Pago requer Access Token de teste, segredo do webhook, URL HTTPS pública e migration aplicada em banco de teste.
- As suítes automatizadas usam mocks; não substituem esses dois testes de integração.

## Ainda não integrado ou dependente de decisão de produto

- Envio automático de convites por e-mail; nesta versão a empreiteira copia e envia o link.
- Cadastro genérico de funcionários de apoio e edição de nível/função; a tela atual administra gerentes com acesso por obra.
- Contratos PDF de demonstração e notificações dentro do aplicativo para todos os eventos.
- Publicação, teste em múltiplos dispositivos e fechamento de issues dependentes dessas funcionalidades.

## Comandos de validação automatizada

```bash
npm --prefix backend test
node --test frontend/tests/*.test.js
npm --prefix frontend run lint
npm --prefix frontend run build
```

O teste de troca de senha (`backend/tests/trocaSenha.test.js`) grava registros temporários. Execute-o apenas com uma base isolada, nunca contra produção ou um banco compartilhado.
