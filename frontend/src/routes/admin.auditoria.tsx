import { createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { useState } from "react";
import { DataToolbar, FilterSelect } from "@/components/shared/DataToolbar";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/auditoria")({
  component: AdminAudit,
});

function AdminAudit() {
  const store = useAppStore();
  const [search, setSearch] = useState("");
  const [user, setUser] = useState("Todos");
  const [action, setAction] = useState("Todas");

  const users = ["Todos", ...Array.from(new Set(store.auditLogs.map((l) => l.user)))];
  const actions = ["Todas", ...Array.from(new Set(store.auditLogs.map((l) => l.action)))];

  const logs = store.auditLogs
    .filter((l) => (user === "Todos" ? true : l.user === user))
    .filter((l) => (action === "Todas" ? true : l.action === action))
    .filter((l) =>
      `${l.user} ${l.action} ${l.entity} ${l.description}`.toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <>
      <PageHeader
        title="Auditoria"
        subtitle="Registro das ações realizadas no sistema."
      />

      <DataToolbar search={search} onSearch={setSearch} placeholder="Buscar no histórico...">
        <FilterSelect value={user} onChange={setUser} options={users} label="Usuário" />
        <FilterSelect value={action} onChange={setAction} options={actions} label="Ação" />
      </DataToolbar>

      {logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nenhum registro encontrado"
          description="Ajuste os filtros para ver outros eventos."
        />
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {logs.map((l) => (
              <div key={l.id} className="surface-card p-4">
                <p className="text-xs text-muted-foreground">{formatDateTime(l.date)}</p>
                <p className="mt-1 font-semibold">{l.action}</p>
                <p className="text-sm text-muted-foreground">{l.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {l.user} · {l.entity}
                </p>
              </div>
            ))}
          </div>

          <div className="surface-card hidden overflow-x-auto lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(l.date)}</TableCell>
                    <TableCell>{l.user}</TableCell>
                    <TableCell className="font-medium">{l.action}</TableCell>
                    <TableCell className="text-muted-foreground">{l.entity}</TableCell>
                    <TableCell className="text-muted-foreground">{l.description}</TableCell>
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
