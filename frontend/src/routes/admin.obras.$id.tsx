import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Building2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StarRating } from "@/components/shared/StarRating";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Timeline, type TimelineStep } from "@/components/shared/Timeline";
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
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import type { WorkStatus } from "@/data/types";
import { brl, formatDate, formatDateTime } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/obras/$id")({
  component: AdminWorkDetail,
});

function AdminWorkDetail() {
  const { id } = Route.useParams();
  const store = useAppStore();
  const [blocked, setBlocked] = useState<string | null>(null);
  const work = store.works.find((w) => w.id === id);

  if (!work) {
    return (
      <EmptyState
        icon={Building2}
        title="Obra não encontrada"
        action={
          <Button asChild variant="outline">
            <Link to="/admin/obras">Voltar para obras</Link>
          </Button>
        }
      />
    );
  }

  const summary = store.paymentSummary(work.id);
  const paid = store.payments.some((p) => p.workId === work.id && p.status === "Aprovado");
  const next: WorkStatus | null =
    work.status === "Agendada" ? "Em andamento" : work.status === "Em andamento" ? "Concluída" : null;

  const steps: TimelineStep[] = [
    { label: "Orçamento aprovado", state: "done" },
    { label: "Pagamento confirmado", state: paid ? "done" : "current" },
    { label: "Obra agendada", state: "done" },
    {
      label: "Obra em andamento",
      state:
        work.status === "Concluída" ? "done" : work.status === "Em andamento" ? "current" : "todo",
    },
    { label: "Obra concluída", state: work.status === "Concluída" ? "done" : "todo" },
  ];

  const advance = () => {
    if (!next) return;
    const result = store.changeWorkStatus(work.id, next);
    if (!result.ok) {
      if (result.message?.includes("pagamentos pendentes")) setBlocked(result.message);
      else toast.error(result.message ?? "Não foi possível alterar o status.");
      return;
    }
    toast.success(`Obra atualizada para ${next}.`);
  };

  const info = [
    ["Cliente", store.clientName(work.clientId)],
    ["Serviço", work.service],
    ["Endereço", work.address],
    ["Responsável", work.responsible],
    ["Início", formatDate(work.startDate)],
    ["Previsão", formatDate(work.endDate)],
    ["Valor total", brl(work.total)],
    ["Pendente", brl(summary.pending)],
  ] as const;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="w-fit gap-2">
        <Link to="/admin/obras">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </Button>

      <PageHeader
        title={`${work.number} — ${work.name}`}
        subtitle={store.clientName(work.clientId)}
        actions={
          <>
            <StatusBadge status={work.status} className="px-3 py-1.5 text-sm" />
            {next ? <Button onClick={advance}>Avançar para {next}</Button> : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="surface-card p-5 sm:p-6">
            <h2 className="font-display text-base font-bold">Informações da obra</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {info.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-0.5 break-words text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="surface-card p-5 sm:p-6">
            <h2 className="font-display text-base font-bold">Progresso</h2>
            <div className="mt-4 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Percentual concluído</span>
                <span className="font-semibold">{work.progress}%</span>
              </div>
              <Progress value={work.progress} />
              <Slider
                value={[work.progress]}
                max={100}
                step={5}
                onValueChange={([v]) => store.setWorkProgress(work.id, v ?? 0)}
                aria-label="Ajustar progresso"
              />
            </div>
          </section>

          <section className="surface-card p-5 sm:p-6">
            <h2 className="font-display text-base font-bold">Atualizações</h2>
            <ul className="mt-4 space-y-3">
              {[...work.updates].reverse().map((u) => (
                <li key={u.id} className="border-l-2 border-brand/40 pl-3">
                  <p className="text-sm font-medium">{u.text}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(u.date)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="surface-card p-5">
            <h2 className="font-display text-base font-bold">Linha do tempo</h2>
            <div className="mt-5">
              <Timeline steps={steps} />
            </div>
          </div>

          {work.review ? (
            <div className="surface-card space-y-2 p-5">
              <h2 className="font-display text-base font-bold">Avaliação do cliente</h2>
              <StarRating value={work.review.rating} size="sm" />
              <p className="text-sm text-muted-foreground">"{work.review.comment}"</p>
            </div>
          ) : null}
        </aside>
      </div>

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
