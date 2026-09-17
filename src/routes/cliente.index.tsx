import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  CalendarClock,
  CircleDollarSign,
  FileClock,
  MapPin,
  Plus,
} from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { brl, formatDate } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/cliente/")({
  component: ClientDashboard,
});

function ClientDashboard() {
  const store = useAppStore();
  const me = store.currentUser!;
  const myWorks = store.works.filter((w) => w.clientId === me.id);
  const myQuotes = store.quotes.filter((q) => q.clientId === me.id);
  const activeWorks = myWorks.filter((w) => w.status !== "Concluída");
  const pendingQuotes = myQuotes.filter(
    (q) => q.status === "Aguardando análise" || q.status === "Em análise",
  );
  const mySchedules = store.schedules
    .filter((s) => s.clientId === me.id && s.status !== "Realizado")
    .sort((a, b) => a.date.localeCompare(b.date));
  const pendingTotal = myWorks.reduce((sum, w) => sum + store.paymentSummary(w.id).pending, 0);

  return (
    <>
      <PageHeader
        title={`Olá, ${me.name.split(" ")[0]}!`}
        subtitle="Acompanhe seus orçamentos, obras e pagamentos."
        actions={
          <Button asChild className="gap-2">
            <Link to="/cliente/orcamentos/novo">
              <Plus className="size-4" /> Solicitar orçamento
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Obras ativas" value={activeWorks.length} icon={Building2} tone="brand" />
        <StatCard
          label="Orçamentos pendentes"
          value={pendingQuotes.length}
          icon={FileClock}
          tone="info"
        />
        <StatCard
          label="Próximo agendamento"
          value={mySchedules[0] ? formatDate(mySchedules[0].date) : "—"}
          hint={mySchedules[0] ? `${mySchedules[0].time} · ${mySchedules[0].team}` : "Nenhum agendado"}
          icon={CalendarClock}
          tone="primary"
        />
        <StatCard
          label="Pagamentos pendentes"
          value={brl(pendingTotal)}
          icon={CircleDollarSign}
          tone={pendingTotal > 0 ? "warning" : "success"}
        />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Minhas obras</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/cliente/obras">Ver todas</Link>
          </Button>
        </div>

        {myWorks.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Você ainda não possui obras"
            description="Solicite um orçamento para iniciar sua primeira obra com o ObraMaster."
            action={
              <Button asChild>
                <Link to="/cliente/orcamentos/novo">Solicitar orçamento</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {myWorks.slice(0, 4).map((work) => (
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

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Previsão</p>
                    <p className="font-semibold">{formatDate(work.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor total</p>
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
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
