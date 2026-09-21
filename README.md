# Build Master

Crie uma aplicação web responsiva chamada ObraMaster, um sistema de gestão de obras e reformas para empresas de construção.

O objetivo é centralizar em uma única plataforma todo o ciclo de uma obra: solicitação de orçamento, aprovação, agendamento, execução, pagamentos, envio de arquivos, acompanhamento de status, avaliação e relatórios administrativos.

O sistema terá dois ambientes principais:

Área do Cliente

Área Administrativa

1. Tecnologias e arquitetura

Utilize:

React

TypeScript

Tailwind CSS

shadcn/ui

Componentes reutilizáveis

Layout responsivo para desktop, tablet e mobile

Neste primeiro momento, implemente o front-end utilizando dados mockados/local state, mas estruture o código de forma que posteriormente seja simples conectar uma API REST.

Não é necessário implementar um backend real ou gateway de pagamento nesta primeira versão.

Evite criar funcionalidades que não estejam relacionadas ao escopo do ObraMaster.

2. Identidade visual

O ObraMaster deve transmitir:

profissionalismo

confiança

organização

construção/reforma

tecnologia

Crie uma identidade visual moderna e profissional.

Paleta sugerida:

Azul escuro / azul petróleo como cor principal

Azul médio para elementos de destaque

Branco e tons de cinza para superfícies

Verde para sucesso/pagamentos aprovados

Amarelo/laranja para alertas e status de atenção

Vermelho apenas para erros e ações destrutivas

Utilize bastante espaço em branco, cards com bordas suaves, sombras discretas e uma hierarquia visual clara.

A interface deve parecer um SaaS profissional de gestão, e não um site institucional.

Use ícones do Lucide.

3. Estrutura geral

Criar um layout com:

Desktop

Sidebar lateral fixa

Logo "ObraMaster"

Menu de navegação

Área principal com header

Nome do usuário

Avatar

Notificações

Conteúdo da página

Mobile

Sidebar transformada em menu lateral/drawer

Header compacto

Cards adaptados para telas pequenas

Tabelas com comportamento responsivo

Botões e formulários fáceis de utilizar por toque

4. LOGIN

Criar uma tela de login moderna.

Elementos:

Logo ObraMaster

Título: "Bem-vindo ao ObraMaster"

Campo de e-mail

Campo de senha

Checkbox "Lembrar de mim"

Botão "Entrar"

Link "Esqueci minha senha"

Link para cadastro de cliente

Para demonstração do projeto, permitir login utilizando usuários mockados.

Criar pelo menos:

usuário Cliente

usuário Administrador

Após o login, direcionar cada perfil para seu respectivo dashboard.

5. CADASTRO DO CLIENTE

Criar tela de cadastro com:

Nome completo

CPF

E-mail

Telefone

Endereço

Cidade

Estado

Senha

Confirmação de senha

Checkbox de aceite dos termos e política de privacidade

Adicionar validações visuais nos campos.

6. ÁREA DO CLIENTE

O cliente deve ter um dashboard simples e intuitivo.

Dashboard do Cliente

Mostrar:

Cards de resumo

Obras ativas

Orçamentos pendentes

Próximo agendamento

Pagamentos pendentes

Seção "Minhas obras"

Exibir cards com:

Nome da obra

Tipo de serviço

Endereço

Status

Data prevista

Valor total

Progresso

Status possíveis:

Agendada
→ Em andamento
→ Concluída

Utilizar badges visuais diferentes para cada status.

7. SOLICITAR ORÇAMENTO

Criar uma página "Novo Orçamento".

Campos:

Tipo de serviço

Descrição do serviço

Endereço da obra

Data desejada

Observações

Upload de arquivos/fotos

Exemplos de serviços:

Pintura

Reforma de banheiro

Reforma de cozinha

Instalação elétrica

Instalação hidráulica

Construção

Outros

Botão:
"Solicitar orçamento"

Após o envio, mostrar confirmação e criar um orçamento com status:

Aguardando análise

8. MEUS ORÇAMENTOS

Criar uma página com lista de orçamentos.

Cada orçamento deve apresentar:

Número do orçamento

Serviço

Data da solicitação

Valor

Status

Ações

Status possíveis:

Aguardando análise

Em análise

Aprovado

Recusado

Expirado

Ao clicar em um orçamento, abrir uma página/modal com todos os detalhes.

Se aprovado, disponibilizar botão:

"Aprovar orçamento"

e posteriormente:

"Ir para pagamento"

9. DETALHES DA OBRA

Criar uma página detalhada para acompanhamento da obra.

Mostrar:

Informações principais

Nome da obra

Tipo de serviço

Endereço

Valor total

Data de início

Previsão de conclusão

Responsável

Status atual

Linha do tempo da obra

Criar uma timeline visual:

✓ Orçamento aprovado
✓ Pagamento confirmado
✓ Obra agendada
● Obra em andamento
○ Obra concluída

A timeline deve deixar claro o estágio atual.

Progresso

Mostrar uma barra de progresso percentual.

Arquivos

Área para:

visualizar arquivos enviados

enviar novos arquivos

visualizar fotos/documentos relacionados à obra

Atualizações

Mostrar histórico de atualizações da obra.

Exemplo:

"Obra atualizada para Em andamento"
"Pagamento confirmado"
"Obra agendada para 25/09/2026"

10. PAGAMENTOS

Criar página "Pagamentos".

Mostrar:

Valor total da obra

Valor já pago

Valor pendente

Histórico de pagamentos

Criar fluxo visual de pagamento com:

Métodos

PIX

Cartão de crédito

Cartão de débito

Para PIX, criar uma interface simulada contendo:

QR Code mockado

Código copia e cola

Valor

Status do pagamento

Para cartão:

Número do cartão

Nome

Validade

CVV

Parcelas

Não implementar processamento financeiro real. Apenas criar a interface e simulação do fluxo.

11. AVALIAÇÃO

Após uma obra ser concluída e não existirem pagamentos pendentes, disponibilizar uma área para avaliação.

Elementos:

Nota de 1 a 5 estrelas

Campo de comentário

Botão "Enviar avaliação"

A avaliação deve estar vinculada à obra.

12. NOTIFICAÇÕES DO CLIENTE

Criar sistema visual de notificações.

Exemplos:

🔔 "Seu orçamento foi aprovado."
🔔 "Sua obra foi agendada para 25/09."
🔔 "Sua obra está em andamento."
🔔 "Pagamento recebido com sucesso."
🔔 "Sua obra foi concluída."

Criar indicador de notificações não lidas no header.

13. ÁREA ADMINISTRATIVA

O administrador terá um dashboard diferente do cliente.

Dashboard Administrativo

Criar cards:

Obras em andamento

Obras agendadas

Orçamentos pendentes

Pagamentos pendentes

Faturamento

Clientes cadastrados

Adicionar gráficos simples e profissionais:

Obras por status

Agendadas

Em andamento

Concluídas

Faturamento

Gráfico mensal com valores recebidos.

Atividades recentes

Lista com as últimas ações realizadas no sistema.

14. GERENCIAMENTO DE ORÇAMENTOS — ADMIN

Criar página para o administrador visualizar todos os orçamentos.

Tabela com:

ID

Cliente

Serviço

Data

Valor

Status

Ações

Adicionar:

busca

filtro por status

filtro por período

ordenação

Ao abrir um orçamento, permitir:

visualizar detalhes

definir/editar preço

aprovar orçamento

recusar orçamento

Quando aprovado, o cliente deve receber uma notificação mockada.

15. GERENCIAMENTO DE PREÇOS

Criar página "Preços".

O administrador poderá visualizar e editar preços base dos serviços.

Tabela:

ServiçoPreço baseUnidadeAçõesPinturaR$ 0,00m²EditarReforma de banheiroR$ 0,00serviçoEditarReforma de cozinhaR$ 0,00serviçoEditarInstalação elétricaR$ 0,00serviçoEditarInstalação hidráulicaR$ 0,00serviçoEditar

Criar modal de edição de preço.

16. AGENDAMENTOS

Criar página de gerenciamento de agendamentos.

Mostrar calendário e lista de agendamentos.

Cada agendamento deve apresentar:

Obra

Cliente

Data

Horário

Endereço

Status

Criar formulário para agendar uma obra.

O sistema deve apresentar visualmente um alerta caso exista conflito de horário.

Não permitir, na interface, que dois serviços sejam agendados para o mesmo horário/recurso quando houver conflito.

17. GERENCIAMENTO DE OBRAS

Criar página administrativa "Obras".

Tabela/lista contendo:

Obra

Cliente

Serviço

Data

Status

Valor

Pagamento

Ações

Permitir abrir detalhes da obra.

O administrador poderá alterar o status:

Agendada → Em andamento → Concluída

IMPORTANTE:

Não permitir marcar uma obra como Concluída caso exista pagamento pendente.

Quando o usuário tentar fazer isso, exibir um modal de alerta explicando:

"Não é possível concluir esta obra enquanto houver pagamentos pendentes."

18. PAGAMENTOS — ADMIN

Criar página administrativa de pagamentos.

Mostrar:

ID da transação

Cliente

Obra

Valor

Método

Data

Status

Status:

Pendente

Aprovado

Recusado

Estornado

Adicionar filtros e busca.

Criar proteção visual contra duplicidade de transações.

Para a demonstração, se o usuário tentar registrar uma transação com o mesmo identificador, mostrar:

"Esta transação já foi registrada."

19. CLIENTES

Criar página administrativa de clientes.

Tabela:

Nome

E-mail

Telefone

Número de obras

Status

Cadastro

Ao clicar, abrir detalhes do cliente e suas respectivas obras/orçamentos.

20. RELATÓRIOS

Criar página "Relatórios".

Permitir visualizar:

Relatório de obras

Total de obras

Obras agendadas

Obras em andamento

Obras concluídas

Relatório financeiro

Faturamento

Pagamentos recebidos

Pagamentos pendentes

Relatório de clientes

Total de clientes

Novos clientes

Adicionar filtros por período.

Criar botão:

"Exportar relatório"

A exportação pode ser simulada no front-end nesta primeira versão.

21. LOG DE AUDITORIA

Criar página administrativa "Auditoria".

Mostrar uma tabela com:

Data/hora

Usuário

Ação

Entidade

Descrição

Exemplos:

"Administrador alterou o status da obra #1024"
"Cliente aprovou orçamento #204"
"Administrador registrou pagamento #839"
"Administrador alterou preço do serviço Pintura"

Criar filtros por usuário, ação e período.

22. REGRAS DE NEGÓCIO NO FRONT-END

Mesmo utilizando dados mockados, simule as principais regras do sistema.

Regra 1 — Status da obra

Fluxo:

Agendada → Em andamento → Concluída

Evitar permitir transições inválidas.

Regra 2 — Pagamento pendente

Não permitir concluir obra com pagamento pendente.

Regra 3 — Conflito de agendamento

Ao tentar criar um agendamento conflitante, mostrar alerta e impedir a confirmação.

Regra 4 — Duplicidade de transação

Não permitir cadastrar duas vezes a mesma transação mockada.

Regra 5 — Notificações

Sempre que ocorrer uma alteração importante, criar uma notificação mockada para o cliente.

Regra 6 — Auditoria

Alterações administrativas importantes devem aparecer no log de auditoria mockado.

23. COMPONENTES REUTILIZÁVEIS

Criar componentes reutilizáveis para:

Sidebar

Header

Cards

Status badges

Botões

Inputs

Selects

Modais

Tabelas

Filtros

Timeline

Progress bars

Notificações

Empty states

Loading states

Toasts

Confirmações

Evitar duplicar código entre páginas.

24. UX E ESTADOS

Todas as telas devem possuir estados adequados.

Criar:

loading

sucesso

erro

lista vazia

confirmação de ação

modal de exclusão/alteração quando necessário

Usar toast para ações como:

orçamento enviado

orçamento aprovado

pagamento registrado

obra atualizada

arquivo enviado

avaliação enviada

25. DADOS MOCKADOS

Criar dados suficientes para que o sistema pareça funcional durante uma apresentação acadêmica.

Criar pelo menos:

5 clientes

8 orçamentos

6 obras

diferentes status de obras

pagamentos aprovados e pendentes

agendamentos

notificações

logs de auditoria

avaliações

Os dados devem ser coerentes entre si.

Por exemplo, uma obra concluída deve possuir pagamento integralizado.

26. NAVEGAÇÃO

Cliente

Menu:

Dashboard

Meus Orçamentos

Minhas Obras

Pagamentos

Notificações

Perfil

Botão de destaque:

+ Solicitar orçamento

Administrador

Menu:

Dashboard

Orçamentos

Obras

Agendamentos

Pagamentos

Clientes

Preços

Relatórios

Auditoria

27. PERFIL

Criar página de perfil para o usuário.

Cliente:

dados pessoais

contato

endereço

alteração de senha

Administrador:

dados do administrador

alteração de senha

28. RESPONSIVIDADE

A aplicação deve funcionar muito bem em:

Desktop

Notebook

Tablet

Smartphone

No mobile:

adaptar tabelas

transformar cards em listas quando necessário

utilizar drawer para navegação

manter botões acessíveis

evitar overflow horizontal

29. EXPERIÊNCIA DE DEMONSTRAÇÃO

O projeto será utilizado em uma apresentação acadêmica.

Por isso, priorize uma experiência visualmente polida e consistente.

O fluxo de demonstração deve funcionar de ponta a ponta utilizando dados mockados:

Fluxo do cliente:

Login → Dashboard → Solicitar orçamento → Visualizar orçamento → Aprovar orçamento → Pagamento → Acompanhar obra → Avaliar serviço

Fluxo do administrador:

Login → Dashboard → Analisar orçamento → Definir preço → Aprovar → Agendar obra → Alterar status → Registrar pagamento → Concluir obra → Visualizar relatório/auditoria

Os dados devem atualizar visualmente durante a navegação para que pareça um sistema funcional.

30. IMPORTANTE

Não criar uma landing page como foco principal.

O foco é uma aplicação SaaS/dashboard de gestão de obras.

Não adicionar funcionalidades como:

chat

marketplace

rede social

sistema de funcionários

estoque

folha de pagamento

CRM completo

a menos que sejam necessárias para o funcionamento das funcionalidades descritas.

Priorize interface profissional, clareza, usabilidade, consistência visual e demonstração das regras de negócio.

Crie a aplicação completa com todas as telas descritas acima e deixe a navegação funcional entre elas.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ae82f132-3730-4a29-9cd6-ce587bd8d6cc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
