import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Building2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataToolbar, FilterSelect } from "@/components/shared/DataToolbar";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { WorkStatus } from "@/data/types";
import { brl, formatDate } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/obras/")({
  component: AdminWorks,
});

const nextStatus: Record<WorkStatus, WorkStatus | null> = {
  Agendada: "Em andamento",
  "Em andamento": "Concluída",
  Concluída: null,
};

function AdminWorks() {
  const store = useAppStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [blocked, setBlocked] = useState<string | null>(null);

  const works = store.works
    .filter((w) => (status === "Todos" ? true : w.status === status))
    .filter((w) =>
      `${w.number} ${w.name} ${w.service} ${store.clientName(w.clientId)}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );

  const advance = (workId: string, to: WorkStatus) => {
    const result = store.changeWorkStatus(workId, to);
    if (!result.ok) {
      if (result.message?.includes("pagamentos pendentes")) {
        setBlocked(result.message);
      } else {
        toast.error(result.message ?? "Não foi possível alterar o status.");
      }
      return;
    }
    toast.success(`Obra atualizada para ${to}.`);
  };

  return (
    <>
      <PageHeader title="Obras" subtitle="Gerencie a execução e o status de cada obra." />

      <DataToolbar search={search} onSearch={setSearch} placeholder="Buscar obra ou cliente...">
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={["Todos", "Agendada", "Em andamento", "Concluída"]}
          label="Status"
        />
      </DataToolbar>

      {works.length === 0 ? (
        <EmptyState icon={Building2} title="Nenhuma obra encontrada" description="Ajuste os filtros." />
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {works.map((w) => {
              const summary = store.paymentSummary(w.id);
              const next = nextStatus[w.status];
              return (
                <div key={w.id} className="surface-card p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground">{w.number}</p>
                      <p className="truncate font-semibold">{w.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {store.clientName(w.clientId)} · {w.service}
                      </p>
                    </div>
                    <StatusBadge status={w.status} />
                  </div>
                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-muted-foreground">{formatDate(w.startDate)}</span>
                    <span className="font-semibold">{brl(w.total)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {summary.pending > 0 ? `Pendente: ${brl(summary.pending)}` : "Pagamento quitado"}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link to="/admin/obras/$id" params={{ id: w.id }}>
                        Detalhes
                      </Link>
                    </Button>
                    {next ? (
                      <Button size="sm" className="flex-1" onClick={() => advance(w.id, next)}>
                        {next}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="surface-card hidden overflow-x-auto lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Obra</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {works.map((w) => {
                  const summary = store.paymentSummary(w.id);
                  const next = nextStatus[w.status];
                  return (
                    <TableRow key={w.id}>
                      <TableCell>
                        <span className="block font-semibold">{w.number}</span>
                        <span className="block text-xs text-muted-foreground">{w.name}</span>
                      </TableCell>
                      <TableCell>{store.clientName(w.clientId)}</TableCell>
                      <TableCell>{w.service}</TableCell>
                      <TableCell>{formatDate(w.startDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={w.status} />
                      </TableCell>
                      <TableCell>{brl(w.total)}</TableCell>
                      <TableCell>
                        <StatusBadge status={summary.pending > 0 ? "Pendente" : "Aprovado"} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link to="/admin/obras/$id" params={{ id: w.id }}>
                              Detalhes
                            </Link>
                          </Button>
                          {next ? (
                            <Button size="sm" onClick={() => advance(w.id, next)}>
                              {next}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <AlertDialog open={Boolean(blocked)} onOpenChange={(v) => !v && setBlocked(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-warning" /> Ação bloqueada
            </AlertDialogTitle>
            <AlertDialogDescription>{blocked}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
