import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, FileImage, Paperclip, Send, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StarRating } from "@/components/shared/StarRating";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Timeline, type TimelineStep } from "@/components/shared/Timeline";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { brl, formatDate, formatDateTime } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/cliente/obras/$id")({
  component: WorkDetail,
});

function WorkDetail() {
  const { id } = Route.useParams();
  const store = useAppStore();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const work = store.works.find((w) => w.id === id);

  if (!work) {
    return (
      <EmptyState
        icon={Building2}
        title="Obra não encontrada"
        action={
          <Button asChild variant="outline">
            <Link to="/cliente/obras">Voltar para minhas obras</Link>
          </Button>
        }
      />
    );
  }

  const summary = store.paymentSummary(work.id);
  const approvedPayment = store.payments.some(
    (p) => p.workId === work.id && p.status === "Aprovado",
  );

  const step = (label: string, done: boolean, current = false): TimelineStep => ({
    label,
    state: done ? "done" : current ? "current" : "todo",
  });

  const steps: TimelineStep[] = [
    step("Orçamento aprovado", true),
    step("Pagamento confirmado", approvedPayment, !approvedPayment),
    step("Obra agendada", true),
    step(
      "Obra em andamento",
      work.status === "Em andamento" || work.status === "Concluída",
      work.status === "Em andamento",
    ),
    step("Obra concluída", work.status === "Concluída", false),
  ];

  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    store.addWorkFile(work.id, {
      id: `${file.name}-${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      uploadedAt: new Date().toISOString().slice(0, 10),
      kind: file.type.startsWith("image/") ? "foto" : "documento",
    });
    toast.success("Arquivo enviado com sucesso.");
  };

  const sendReview = () => {
    const result = store.addReview(work.id, rating, comment);
    if (!result.ok) {
      toast.error(result.message ?? "Não foi possível enviar a avaliação.");
      return;
    }
    toast.success("Avaliação enviada. Obrigado!");
    setComment("");
  };

  const info = [
    ["Obra", work.name],
    ["Tipo de serviço", work.service],
    ["Endereço", work.address],
    ["Valor total", brl(work.total)],
    ["Data de início", formatDate(work.startDate)],
    ["Previsão de conclusão", formatDate(work.endDate)],
    ["Responsável", work.responsible],
  ] as const;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="w-fit gap-2">
        <Link to="/cliente/obras">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </Button>

      <PageHeader
        title={`${work.number} — ${work.name}`}
        subtitle={work.service}
        actions={<StatusBadge status={work.status} className="px-3 py-1.5 text-sm" />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="surface-card p-5 sm:p-6">
            <h2 className="font-display text-base font-bold">Informações principais</h2>
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

            <div className="mt-6">
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso da obra</span>
                <span className="font-semibold">{work.progress}%</span>
              </div>
              <Progress value={work.progress} />
            </div>
          </section>

          <section className="surface-card p-5 sm:p-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <h2 className="font-display text-base font-bold">Arquivos</h2>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-muted">
                <Upload className="size-4" /> Enviar
                <input type="file" className="hidden" onChange={upload} />
              </label>
            </div>
            {work.files.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhum arquivo enviado nesta obra ainda.
              </p>
            ) : (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {work.files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      {f.kind === "foto" ? <FileImage className="size-4" /> : <Paperclip className="size-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{f.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {f.size} · {formatDate(f.uploadedAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface-card p-5 sm:p-6">
            <h2 className="font-display text-base font-bold">Atualizações</h2>
            <ul className="mt-4 space-y-3">
              {[...work.updates].reverse().map((u) => (
                <li key={u.id} className="flex gap-3 border-l-2 border-brand/40 pl-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{u.text}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(u.date)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {work.status === "Concluída" ? (
            <section className="surface-card p-5 sm:p-6">
              <h2 className="font-display text-base font-bold">Avaliação do serviço</h2>
              {work.review ? (
                <div className="mt-3 space-y-2">
                  <StarRating value={work.review.rating} />
                  <p className="text-sm text-muted-foreground">"{work.review.comment}"</p>
                  <p className="text-xs text-muted-foreground">
                    Enviada em {formatDate(work.review.date)}
                  </p>
                </div>
              ) : summary.pending > 0 ? (
                <p className="mt-3 rounded-lg bg-warning/15 px-3 py-2 text-sm font-medium text-warning-foreground">
                  A avaliação será liberada após a quitação dos pagamentos pendentes.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  <StarRating value={rating} onChange={setRating} size="lg" />
                  <Textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Conte como foi sua experiência com a equipe..."
                    className="bg-card"
                  />
                  <Button onClick={sendReview} className="gap-2">
                    <Send className="size-4" /> Enviar avaliação
                  </Button>
                </div>
              )}
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="surface-card p-5">
            <h2 className="font-display text-base font-bold">Linha do tempo</h2>
            <div className="mt-5">
              <Timeline steps={steps} />
            </div>
          </div>

          <div className="surface-card space-y-3 p-5">
            <h2 className="font-display text-base font-bold">Pagamentos</h2>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{brl(summary.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pago</span>
              <span className="font-semibold text-success">{brl(summary.paid)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pendente</span>
              <span className="font-semibold text-warning-foreground">{brl(summary.pending)}</span>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/cliente/pagamentos">Ver pagamentos</Link>
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}
