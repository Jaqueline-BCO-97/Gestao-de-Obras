import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, Users } from "lucide-react";
import { useState } from "react";
import { DataToolbar, FilterSelect } from "@/components/shared/DataToolbar";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, formatDate } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/clientes")({
  component: AdminClients,
});

function AdminClients() {
  const store = useAppStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [selected, setSelected] = useState<string | null>(null);

  const clients = store.clients
    .filter((c) =>
      status === "Todos" ? true : status === "Ativo" ? c.active : !c.active,
    )
    .filter((c) => `${c.name} ${c.email} ${c.phone ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  const client = store.clients.find((c) => c.id === selected);
  const clientWorks = client ? store.works.filter((w) => w.clientId === client.id) : [];
  const clientQuotes = client ? store.quotes.filter((q) => q.clientId === client.id) : [];

  return (
    <>
      <PageHeader title="Clientes" subtitle="Base de clientes cadastrados na plataforma." />

      <DataToolbar search={search} onSearch={setSearch} placeholder="Buscar cliente...">
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={["Todos", "Ativo", "Inativo"]}
          label="Status"
        />
      </DataToolbar>

      {clients.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum cliente encontrado" />
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {clients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c.id)}
                className="surface-card w-full p-4 text-left transition hover:border-brand/40"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{c.email}</p>
                  </div>
                  <StatusBadge status={c.active ? "Ativo" : "Inativo"} />
                </div>
                <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                  <span>{c.phone ?? "—"}</span>
                  <span>{store.works.filter((w) => w.clientId === c.id).length} obra(s)</span>
                </div>
              </button>
            ))}
          </div>

          <div className="surface-card hidden overflow-x-auto lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Obras</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold">{c.name}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>{store.works.filter((w) => w.clientId === c.id).length}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.active ? "Ativo" : "Inativo"} />
                    </TableCell>
                    <TableCell>{formatDate(c.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelected(c.id)}>
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={Boolean(client)} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {client ? (
            <>
              <DialogHeader>
                <DialogTitle>{client.name}</DialogTitle>
                <DialogDescription>
                  Cliente desde {formatDate(client.createdAt)} · {client.city ?? "—"}/{client.state ?? "—"}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="size-4" /> {client.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="size-4" /> {client.phone ?? "—"}
                </span>
              </div>

              <section className="space-y-2">
                <h3 className="font-display text-sm font-bold">Obras ({clientWorks.length})</h3>
                {clientWorks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma obra registrada.</p>
                ) : (
                  clientWorks.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {w.number} — {w.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{brl(w.total)}</p>
                      </div>
                      <StatusBadge status={w.status} />
                    </div>
                  ))
                )}
              </section>

              <section className="space-y-2">
                <h3 className="font-display text-sm font-bold">Orçamentos ({clientQuotes.length})</h3>
                {clientQuotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum orçamento registrado.</p>
                ) : (
                  clientQuotes.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {q.number} — {q.service}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {q.value ? brl(q.value) : "A definir"}
                        </p>
                      </div>
                      <StatusBadge status={q.status} />
                    </div>
                  ))
                )}
              </section>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
