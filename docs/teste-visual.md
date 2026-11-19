# Roteiro de teste visual integrado

Execute tudo em um banco isolado de demonstração, nunca no banco compartilhado ou de produção. Revise e aplique as migrations aditivas nesse banco com `cd backend && npx prisma migrate deploy`; depois execute `cd backend && OBRAMASTER_DEMO_SEED=true npx prisma db seed`. O seed é repetível e exige a confirmação explícita `OBRAMASTER_DEMO_SEED=true`. Para preparar uma base descartável, configure a conexão no ambiente local com as instruções do README. Não coloque credenciais neste documento; no banco compartilhado, Jaqueline aplica a migration.

As três contas demo usam a senha `Demo@12345`:

| Perfil | Login |
|---|---|
| Administrador | `admin@obramaster.demo` |
| Cliente | `cliente@obramaster.demo` |
| Gerente/colaborador | `colaborador@obramaster.demo` |

## Perfil e contatos — todos os perfis

**Perfil:** Admin, Cliente e Gerente, um de cada vez. **Tela:** menu lateral → Perfil (`/perfil`).

1. Confira a foto acima dos itens do menu lateral e no formulário do perfil.
2. Abra “Dados pessoais e contato”; confirme que endereço e CPF estão visíveis e que o CPF tem máscara `000.000.000-00`.
3. Digite um CPF inválido e salve; o erro deve aparecer no formulário. Use `529.982.247-25` para conferir a validação positiva.
4. Confirme que o telefone adicional começa oculto. Clique “Adicionar telefone”, preencha e salve; o campo deve permanecer disponível no próximo acesso.
5. Escolha uma imagem JPG, PNG ou WebP de até 5 MB, salve e recarregue. A foto deve aparecer no menu e no perfil. Repita com arquivo maior que 5 MB e confira a mensagem junto ao campo.
6. Se o ambiente não tiver Cloudinary configurado, o envio deve informar claramente que é necessário configurar `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET`. O seed usa as fotos demo locais até uma imagem real ser enviada.

## Cliente

**Perfil:** Cliente (`cliente@obramaster.demo`).

1. **Obras e parcelas atrasadas:** abra `/cliente` e **Pagamentos** (`/cliente/pagamentos`). Em “Reforma Completa de Apartamento Jardins”, a 2ª parcela deve constar como “Atrasada”, com destaque visual.
2. **Preços:** abra o item “Tabela de preços” no menu ou `/cliente/precos`. A lista deve exibir apenas preços ativos, sem controles de edição.
3. **Contrato:** abra **Contratos** (`/cliente/contratos`) e clique “Abrir contrato em PDF”. Deve abrir `contrato-exemplo.pdf` em outra aba.
4. **Bloqueio de obra:** abra uma obra por `/cliente/obra/:id` e confirme a conclusão pelo botão. Deve abrir o modal do sistema com Confirmar/Cancelar. Cancelar mantém o estado; confirmar registra o aceite e mostra o resultado junto ao botão.
5. **Notificações:** abra `/cliente/notificacoes`; eventos visíveis ao cliente devem listar o nome da obra e permitir abrir apenas uma obra vinculada ao cliente.
6. **Acesso indevido:** copie a URL de uma obra que pertence a outra conta/empresa e abra após autenticar como cliente. O backend deve negar a consulta e a tela deve mostrar uma mensagem de acesso/obra indisponível.

## Administrador

**Perfil:** Admin (`admin@obramaster.demo`).

1. **Feedback e modal:** em `/admin/funcionarios/gerentes`, envie o formulário vazio/inválido e confirme que o erro aparece junto ao formulário. Clique “Remover acesso”; o modal mostra só a pergunta e os botões Confirmar/Cancelar. Cancelar não altera a escala.
2. **Alinhamento:** abra **Gestão de Obras** (`/admin/obras`). Nas linhas em andamento, “Gerenciar” e “Solicitar conferência” devem ter a mesma largura e alinhamento.
3. **Arquivamento permitido:** em `/admin/obra/:id`, abra **Casa de máquinas**. O seed a prepara como Agendada, com a 1ª parcela pendente e sem pagamentos. No bloco “Arquivar obra”, informe motivo e senha demo, confirme no modal e arquive. A obra deve sair da lista ativa e aparecer em “Obras arquivadas”, com possibilidade de restauração.
4. **Bloqueio por pagamento/status:** tente arquivar “Reforma Completa de Apartamento Jardins”, que tem parcela paga e está em andamento. O botão deve ficar bloqueado ou a API deve recusar; aviso/erro aparece dentro do bloco “Arquivar obra”. A obra não pode ser apagada nem arquivada. Obras em andamento devem seguir solicitação de conferência e aceite do cliente.
5. **Funcionário sem foto:** em `/admin/funcionarios`, cadastre um funcionário sem selecionar foto. Deve salvar. Edite-o: abaixo do Nome, confira o retângulo vazio quando não há foto e o botão “Adicionar foto”; depois de enviar, o rótulo deve mudar para “Trocar foto”.
6. **Gerente com convite pendente:** em `/admin/funcionarios/gerentes`, gere convite para uma obra e não aceite. O gerente deve aparecer em “Gerentes com acesso” marcado “Convite pendente”.
7. **Convite de cliente pendente:** em `/admin/obras`, crie uma obra sem cliente e envie convite pela tela **Clientes** (`/admin/clientes`). Antes do aceite, tente confirmar a 1ª parcela em **Pagamentos** (`/admin/pagamentos`) e iniciar execução em `/admin/obra/:id`. As duas ações devem estar desabilitadas e o backend deve recusar chamadas diretas. Depois do aceite, atualize e confirme que o bloqueio foi removido.
8. **Calendário futuro:** abra `/admin/calendario`. A obra **Construção Residencial Bela Vista**, agendada para fevereiro de 2027, deve aparecer em “Próximas obras”. Reagende uma obra para três meses à frente; a data deve persistir e surgir na lista ordenada.
9. **Parcela atrasada:** abra `/admin/pagamentos` e confira a mesma 2ª parcela vencida que aparece no cliente, com texto e cor de atraso.
10. **Preço:** abra `/admin/precos`, cadastre um preço de teste e confira o resultado em `/cliente/precos` após sair e entrar como cliente. Remova o preço de teste depois da demonstração.
11. **Notificações por evento:** abra `/admin/notificacoes`. Para validar novos eventos, edite dados de uma obra, anexe contrato, registre anotação/foto e altere escala/agendamento. Cada ação deve gerar notificação aos usuários corretos.
12. **Notificações por obra:** abra `/admin/obra/:id` e clique “Notificações desta obra”. A lista deve conter apenas eventos daquela obra; repita com outra obra e compare.

## Gerente/colaborador

**Perfil:** Gerente (`colaborador@obramaster.demo`).

1. **Cabeçalho e numeração:** abra `/colaborador`. A foto demo deve ocupar o espaço do avatar, sem selo “Acesso Operacional”. As obras aparecem como “Obra 1”, “Obra 2”… em ordem de alocação, sem ID técnico visível.
2. **Detalhe da obra:** clique “Ver canteiro”. O cabeçalho deve mostrar somente `Obra: <nome>`; confira que não aparece ID técnico no texto.
3. **Movimentação e perda de acesso:** deixe o painel do gerente aberto em uma obra. Em outra sessão, como Admin, mova esse gerente para outra obra em `/admin/funcionarios/gerentes`. Atualize a sessão do gerente: a obra de origem deve sumir, a obra de destino deve aparecer e `/colaborador/obra/:id-antigo` deve ser negada pelo backend. Deve chegar a notificação “Você foi movido para outra obra”. Se o gerente também tinha outras alocações, elas devem continuar ativas.
4. **Histórico isolado:** abra `/colaborador/notificacoes` e, pelo detalhe de cada obra, confira que timeline e notificações não exibem eventos de outra obra.
5. **Registrar andamento:** em uma obra ativa, abra “Registrar andamento”, escreva uma anotação e salve. O sucesso deve aparecer junto ao formulário; o novo evento deve aparecer na timeline da mesma obra. Envie foto válida e inválida para conferir validação e mensagem junto ao campo.
6. **Acesso removido:** como Admin, remova a escala ativa do gerente. Atualize o painel do gerente; a obra deve desaparecer, e qualquer tentativa de abrir a URL antiga deve ser negada.

## Desempenho e mensagens

1. Compare login, logout, troca de perfil, `/admin`, `/cliente`, `/colaborador` e `/perfil` na versão base (`3d228de`) e na versão ajustada, usando o mesmo navegador, máquina e banco demo. No DevTools → Network, marque “Disable cache”; registre duração e número de chamadas por rota, repetindo cada fluxo três vezes.
2. Verifique que GETs idênticos disparados ao mesmo tempo resultam em uma chamada de rede, e que uma nova consulta depois da conclusão busca dados atualizados. O teste `frontend/tests/authRequestDedupe.test.js` mediu duas chamadas concorrentes antes e uma depois (2 → 1, redução de 50%).
3. A listagem dos painéis carrega no máximo 10 eventos recentes e as duas primeiras parcelas por obra; não carrega disponibilidades no resumo e só inclui contrato na lista do cliente. O detalhe mantém o histórico completo.
4. Em telas com formulário, produza erro e sucesso de cada ação. Mensagens devem estar junto do campo ou botão usado, com bom contraste; não devem aparecer como aviso global no topo da página.
5. Confira que nenhuma confirmação chama `alert()`/`confirm()` do navegador. Cancelar um modal não deve executar a ação.

Na validação automatizada desta entrega, `frontend/dist/assets/index-*.js` ficou com 123,08 KB gzip (base `3d228de`: 119,65 KB); CSS ficou com 7,19 KB gzip (base: 7,10 KB). A medição de tempo real e número de chamadas por tela deve ser preenchida na tabela abaixo, no mesmo navegador e banco de demonstração. A conexão ao banco estava indisponível durante esta execução, então não há medida válida de latência de API antes/depois.

## Registro do resultado

Preencha durante a execução manual:

| Fluxo | Versão | Requisições | Duração (3 repetições) | Observações |
|---|---|---:|---|---|
| Login e painel Admin | Base / Ajustada |  |  |  |
| Sair e login Cliente | Base / Ajustada |  |  |  |
| Troca para Gerente | Base / Ajustada |  |  |  |
| Abrir Perfil | Base / Ajustada |  |  |  |

O teste automatizado `frontend/tests/authRequestDedupe.test.js` cobre a redução de duas chamadas GET idênticas simultâneas para uma chamada; o tempo medido no mock não substitui o benchmark visual acima.
