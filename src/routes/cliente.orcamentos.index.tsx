import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { DataToolbar, FilterSelect } from "@/components/shared/DataToolbar";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, formatDate } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/cliente/orcamentos/")({
  component: MyQuotes,
});

const STATUS = ["Todos", "Aguardando análise", "Em análise", "Aprovado", "Recusado", "Expirado"];

function MyQuotes() {
  const store = useAppStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");

  const quotes = store.quotes
    .filter((q) => q.clientId === store.currentUser?.id)
    .filter((q) => (status === "Todos" ? true : q.status === status))
    .filter((q) =>
      `${q.number} ${q.service} ${q.description}`.toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <>
      <PageHeader
        title="Meus orçamentos"
        subtitle="Acompanhe suas solicitações e aprove os valores enviados."
        actions={
          <Button asChild className="gap-2">
            <Link to="/cliente/orcamentos/novo">
              <Plus className="size-4" /> Novo orçamento
            </Link>
          </Button>
        }
      />

      <DataToolbar
        search={search}
        onSearch={setSearch}
        placeholder="Buscar por número ou serviço..."
      >
        <FilterSelect value={status} onChange={setStatus} options={STATUS} label="Status" />
      </DataToolbar>

      {quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum orçamento encontrado"
          description="Ajuste os filtros ou solicite um novo orçamento."
        />
      ) : (
        <>
          {/* Mobile: lista de cards */}
          <div className="space-y-3 lg:hidden">
            {quotes.map((q) => (
              <Link
                key={q.id}
                to="/cliente/orcamentos/$id"
                params={{ id: q.id }}
                className="surface-card block p-4"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">{q.number}</p>
                    <p className="truncate font-semibold">{q.service}</p>
                  </div>
                  <StatusBadge status={q.status} />
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">{formatDate(q.createdAt)}</span>
                  <span className="font-semibold">{q.value === null ? "A definir" : brl(q.value)}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: tabela */}
          <div className="surface-card hidden overflow-hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Solicitado em</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-semibold">{q.number}</TableCell>
                    <TableCell>{q.service}</TableCell>
                    <TableCell>{formatDate(q.createdAt)}</TableCell>
                    <TableCell>{q.value === null ? "A definir" : brl(q.value)}</TableCell>
                    <TableCell>
                      <StatusBadge status={q.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link to="/cliente/orcamentos/$id" params={{ id: q.id }}>
                          Detalhes
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </>
  );
}
