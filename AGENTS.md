# Regras do projeto

- Nunca ler nem exibir `.env` ou segredos; nunca commitar segredos.
- Nunca rodar prisma migrate/db push/seed contra banco compartilhado (`prisma generate` pode). Migrations só aditivas (colunas novas opcionais), criadas só depois de eu aprovar o plano; eu aplico no Supabase.
- Não alterar JWT, sessão, permissões, isolamento por empresa, Mercado Pago, Cloudinary, nem cálculo de cobrança e parcelas.
- Não remover páginas, rotas, campos ou dados. API só retrocompatível, atualizando docs/api-contract.md. Sem dependências novas sem minha autorização.
- NÃO alterar cores, logo, fontes, tema, tailwind.config, favicon nem identidade visual (será outra tarefa).
- Git: nunca na main; ao fim de cada lote: lint, build, testes, commit em português (título curto + 2 a 4 linhas simples) e `git push -u origin <branch>`; nunca apagar branch, force-push ou reescrever histórico sem meu OK.
- Comentários linha a linha nos arquivos alterados (sou iniciante de ADS). Testes para regras novas sem gravar em banco compartilhado. Nunca declare teste aprovado sem rodar; diga o que não verificou.
- Fluxo por lote: diagnóstico curto + plano → PARE e espere meu "pode seguir" → implementar → validar → commit + push → resumo curto → PARE.
