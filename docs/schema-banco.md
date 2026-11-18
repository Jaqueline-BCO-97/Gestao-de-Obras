# Modelo de dados ObraMaster

O schema executável está em `backend/prisma/schema.prisma`; as migrations correspondentes ficam em `backend/prisma/migrations/`. A migration `20261118120000_convites` adiciona convites de cliente e gerente com token armazenado como hash.

## Entidades e relações

- **Empresa** é o tenant. É dona dos usuários, obras, funcionários, eventos, contratos, preços e convites.
- **Usuario** pertence a uma empresa e possui um perfil: `ADMIN` (empreiteira), `CLIENTE` ou `COLABORADOR` (gerente de obra). Um cliente acompanha apenas obras associadas ao seu `clienteId`; o gerente acessa somente obras com escala ativa para seu funcionário.
- **Obra** pertence a uma empresa e pode ter um cliente. `ObraEscala` associa funcionários a períodos de acesso. `ObraEvento` guarda a linha do tempo. `Parcela` e `Pagamento` representam o financeiro; `Contrato` guarda os termos, com `ContratoAceite` por usuário.
- **Funcionario** pertence a uma empresa, pode ter uma conta `Usuario` vinculada e tem nível `RESPONSAVEL` ou `APOIO`. Escalas abertas concedem acesso do gerente a uma obra; escalas encerradas permanecem como histórico.
- **Convite** pertence à empresa, obra e administrador que o emitiu. O tipo é `CLIENTE` ou `GERENTE`; o token bruto só aparece no link emitido, enquanto o banco guarda `tokenHash`. `expiraEm` e `usadoEm` controlam validade e uso único.
- **TabelaPreco** guarda serviço, unidade, valor e estado ativo por empresa.

## Limites e integridade

- Relações usam chaves estrangeiras; IDs externos são UUIDs.
- `Pagamento` exige que obra, parcela e empresa sejam consistentes no repositório e usa chaves de idempotência/transação externa únicas.
- `Parcela` é única por obra e número; cada obra possui no máximo um contrato.
- As consultas de negócio aplicam `empresaId` vindo da sessão autenticada. O frontend não escolhe nem substitui o tenant.
- Escalas mantêm data de início/fim e autor da alteração; encerrar acesso atualiza a escala existente em vez de excluí-la.

## Verificação local

```bash
cd backend
npx prisma validate
npx prisma migrate status
npx prisma migrate deploy
```

Execute `migrate deploy` apenas contra uma base isolada de teste ou o ambiente de destino autorizado.
