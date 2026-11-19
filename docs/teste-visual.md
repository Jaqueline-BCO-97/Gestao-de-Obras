# Roteiro de teste visual

Use um banco de demonstração isolado. As três contas usam a senha `Demo@12345`:

| Perfil | Login |
|---|---|
| Administrador | `admin@obramaster.demo` |
| Cliente | `cliente@obramaster.demo` |
| Colaborador/gerente | `colaborador@obramaster.demo` |

## Fotos de perfil

### Administrador

1. Entre como administrador e abra `/admin`.
2. Confira a foto redonda ao lado de **Perfil** e **Sair** na barra superior.
3. Abra **Perfil** (`/perfil`). A foto deve aparecer acima dos itens do menu lateral, ao lado do título **Meu perfil** e no formulário **Dados pessoais e contato**.
4. Para conferir o fallback, bloqueie temporariamente `/foto-admin.png` no painel Network do navegador e recarregue `/perfil`. O avatar deve mostrar as iniciais; remova o bloqueio para restaurar a foto.
5. Escolha uma foto JPG, PNG ou WebP de até 5 MB e salve os dados. Após o salvamento, a foto enviada deve substituir a foto de demonstração nos mesmos lugares.

### Cliente

1. Saia e entre como cliente.
2. Abra **Perfil** (`/perfil`). Confira a foto acima dos itens do menu lateral, ao lado de **Meu perfil** e no formulário de dados pessoais.
3. Para conferir o fallback, bloqueie temporariamente `/foto-cliente.png` no painel Network e recarregue a página. O avatar deve mostrar as iniciais; depois remova o bloqueio.
4. Envie e salve uma foto JPG, PNG ou WebP de até 5 MB. A nova imagem deve substituir a foto de demonstração. Recarregue a página e confirme que ela permanece.

### Colaborador/gerente

1. Saia e entre como colaborador.
2. Abra **Perfil** (`/perfil`). Confira a foto acima do menu lateral, ao lado de **Meu perfil** e no formulário.
3. Envie e salve outra foto válida; ela deve substituir a imagem de demonstração. Se `/foto-colaborador.png` não carregar e não houver foto enviada, devem aparecer as iniciais.

## Fluxos de bloqueio e dados

### Obra com pagamento não pode ser arquivada

1. Entre como administrador e abra **Gestão de Obras**.
2. Abra uma obra que já tenha parcela paga ou pagamento em processamento e acesse **Arquivar obra**.
3. Tente arquivar. O sistema deve impedir a operação e mostrar o aviso dentro do próprio bloco, sem apagar a obra.

### Convite pendente não libera pagamento nem execução

1. Como administrador, crie ou escolha uma obra com convite de cliente ainda pendente.
2. Tente confirmar a primeira parcela e iniciar a execução.
3. As ações devem ficar bloqueadas na interface; uma tentativa direta à API também deve ser recusada pelo backend.
4. Aceite o convite em outra sessão e confirme que o bloqueio só é removido depois do aceite.

### Gerente movido perde o acesso à obra anterior

1. Como administrador, abra **Gerentes** (`/admin/funcionarios/gerentes`) e mova o gerente de uma obra para outra.
2. Em outra sessão, entre como colaborador/gerente e atualize o painel.
3. A obra anterior deve desaparecer e não pode ser aberta nem alterada; deve aparecer uma notificação informando que o gerente foi movido.

### Parcela vencida

1. Entre como cliente e abra **Pagamentos** (`/cliente/pagamentos`).
2. Confira a segunda parcela vencida de uma obra de demonstração, destacada como atrasada.
3. Entre como administrador, abra **Pagamentos** e confirme que a mesma parcela também aparece como atrasada.

### Notificações

1. Confira `/admin/notificacoes` como administrador, `/cliente/notificacoes` como cliente e `/colaborador/notificacoes` como colaborador.
2. Verifique os avisos existentes e gere uma alteração de teste (por exemplo, reagendamento ou novo andamento).
3. Atualize a tela e confira a notificação correspondente, com acesso somente às obras permitidas ao perfil.

## Upload e desempenho

- O upload de foto de perfil usa o Cloudinary já configurado pelo backend. Teste uma imagem válida de até 5 MB e um arquivo maior que 5 MB; a imagem válida deve ser salva e a inválida deve receber mensagem junto ao campo. Para a gravação real, o ambiente precisa ter Cloudinary configurado.
- Para comparar tempos de navegação, use o mesmo banco e navegador, abra o DevTools em **Network**, marque **Disable cache** e registre duração e número de requisições ao entrar, sair, trocar de perfil e abrir `/perfil`. Repita o roteiro na versão base e na branch, nas mesmas condições.
