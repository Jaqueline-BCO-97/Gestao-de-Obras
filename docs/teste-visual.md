# Roteiro de teste visual

Use as contas de demonstração. Senha: `Demo@12345`.

- Admin: `admin@obramaster.demo`
- Cliente: `cliente@obramaster.demo`
- Gerente: `colaborador@obramaster.demo`

## Admin

1. Entre como Admin e clique em **Gestão de Obras**, **Clientes**, **Funcionários**, **Gerentes**, **Preços**, **Calendário**, **Pagamentos** e **Notificações**. Confirme que o menu continua visível em cada tela.
2. Abra uma obra em **Gestão de Obras**. Confira o menu, os dados, as parcelas e o histórico. Clique em **Adicionar gerente**, escolha um gerente já cadastrado e use **Adicionar outro** para escolher outro com função diferente.
3. Na tela da obra, tente escolher dois gerentes com a mesma função e confira que o segundo não pode ser selecionado. Clique **Voltar** uma vez.
4. Em **Gestão de Obras**, clique em **Cadastrar obra**. Escolha de 1 a 36 parcelas e uma data inicial. Confira o valor estimado, inclusive o acréscimo acima de 12 parcelas.
5. Em **Clientes**, cadastre um cliente com estado, cidade, bairro, rua, número e telefone. Marque as caixas de apartamento/bloco quando não existirem; anexe um PDF válido e gere o convite.
6. Em **Clientes**, clique **Informações** em um cliente. Confira o endereço pessoal, CPF, contatos e endereços das obras. Abra a confirmação de exclusão e clique **Cancelar**.
7. Em **Clientes**, abra a confirmação de exclusão de um convite expirado e clique **Cancelar**. Um convite ainda válido deve oferecer **Gerar novo link**.
8. Em **Funcionários**, cadastre e edite um funcionário sem escolher obra. Digite parte de um nome no campo de busca, abra uma obra na lista em cascata, marque dias e salve. Teste a máscara do telefone, selecione uma foto e salve.
9. Em **Preços**, cadastre um serviço, desative e reative, depois clique **Excluir** e cancele o modal.
10. Em **Calendário**, selecione uma obra, informe início e prazo usando somente datas e salve. Agende outra obra para um período sobreposto e confira que as duas aparecem na agenda.
11. Em **Pagamentos**, confira os estados: pago em verde, pendente em amarelo e atrasado em vermelho.
12. Em **Notificações**, clique **Filtrar notificações** e selecione as categorias disponíveis para Admin.
13. Nas telas de perfil, funcionário, obra, andamento e comprovante, selecione arquivos válidos e inválidos. Sem armazenamento configurado, confira a mensagem com os três nomes de variáveis Cloudinary.

## Cliente

1. Entre como Cliente e clique em **Início**, **Pagamentos**, **Preços**, **Contratos**, **Notificações** e **Perfil**. Confirme que o menu aparece em todas essas telas; no Perfil, o menu fica apenas na lateral.
2. Em **Contratos**, clique para abrir o PDF em cada obra demo.
3. Em **Pagamentos**, confira as cores de pago, pendente e atrasado. Clique **Pagar online** em uma parcela e confira que essa tela não mostra o menu. Use o único botão **Voltar** para retornar.
4. Abra uma obra **Aguardando conferência**, clique **Confirmar conclusão** e confirme no modal.
5. Em **Notificações**, clique **Filtrar notificações** e confira as categorias próprias do Cliente.
6. No **Perfil**, preencha os campos de endereço e telefone e salve.

## Gerente

1. Entre como Gerente e clique em **Início**, **Notificações** e **Perfil**. Confirme que o menu permanece visível.
2. Abra uma obra e confira que aparecem o endereço da obra e o telefone de contato do cliente, sem CPF ou endereço pessoal.
3. Registre uma atualização com foto. Se o upload não estiver configurado, confira a mensagem clara; depois de configurar, tente novamente.
4. Em **Notificações**, clique **Filtrar notificações** e confira as categorias próprias do Gerente.
