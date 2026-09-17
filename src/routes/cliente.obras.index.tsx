import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, MapPin } from "lucide-react";
import { useState } from "react";
import { DataToolbar, FilterSelect } from "@/components/shared/DataToolbar";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { brl, formatDate } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/cliente/obras/")({
  component: MyWorks,
});

function MyWorks() {
  const store = useAppStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");

  const works = store.works
    .filter((w) => w.clientId === store.currentUser?.id)
    .filter((w) => (status === "Todos" ? true : w.status === status))
    .filter((w) => `${w.number} ${w.name} ${w.service}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHeader title="Minhas obras" subtitle="Acompanhe o andamento de cada obra em tempo real." />

      <DataToolbar search={search} onSearch={setSearch} placeholder="Buscar obra...">
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={["Todos", "Agendada", "Em andamento", "Concluída"]}
          label="Status"
        />
      </DataToolbar>

      {works.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma obra encontrada"
          description="Solicite um orçamento para iniciar uma nova obra."
          action={
            <Button asChild>
              <Link to="/cliente/orcamentos/novo">Solicitar orçamento</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {works.map((work) => {
            const summary = store.paymentSummary(work.id);
            return (
              <Link
                key={work.id}
                to="/cliente/obras/$id"
                params={{ id: work.id }}
                className="surface-card block p-5 transition-shadow hover:shadow-[var(--shadow-float)]"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">{work.number}</p>
                    <h3 className="truncate font-display text-base font-bold">{work.name}</h3>
                    <p className="text-sm text-muted-foreground">{work.service}</p>
                  </div>
                  <StatusBadge status={work.status} />
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0">{work.address}</span>
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Início</p>
                    <p className="font-semibold">{formatDate(work.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Previsão</p>
                    <p className="font-semibold">{formatDate(work.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="font-semibold">{brl(work.total)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>Progresso</span>
                    <span className="font-semibold text-foreground">{work.progress}%</span>
                  </div>
                  <Progress value={work.progress} />
                </div>
                {summary.pending > 0 ? (
                  <p className="mt-3 rounded-lg bg-warning/15 px-3 py-2 text-xs font-semibold text-warning-foreground">
                    Pagamento pendente de {brl(summary.pending)}
                  </p>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
