import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, CreditCard, FileText, Paperclip } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { brl, formatDate } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/cliente/orcamentos/$id")({
  component: QuoteDetail,
});

function QuoteDetail() {
  const { id } = Route.useParams();
  const store = useAppStore();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const quote = store.quotes.find((q) => q.id === id);
  const work = store.works.find((w) => w.quoteId === id);

  if (!quote) {
    return (
      <EmptyState
        icon={FileText}
        title="Orçamento não encontrado"
        description="Ele pode ter sido removido."
        action={
          <Button asChild variant="outline">
            <Link to="/cliente/orcamentos">Voltar para a lista</Link>
          </Button>
        }
      />
    );
  }

  const approve = () => {
    const result = store.clientApproveQuote(quote.id);
    setConfirm(false);
    if (!result.ok) {
      toast.error(result.message ?? "Não foi possível aprovar.");
      return;
    }
    toast.success("Orçamento aprovado! Sua obra foi criada.");
  };

  const canApprove = quote.value !== null && quote.status !== "Aprovado" && quote.status !== "Recusado";

  const rows = [
    ["Número", quote.number],
    ["Serviço", quote.service],
    ["Solicitado em", formatDate(quote.createdAt)],
    ["Data desejada", formatDate(quote.desiredDate)],
    ["Endereço", quote.address],
    ["Valor", quote.value === null ? "Aguardando definição" : brl(quote.value)],
  ] as const;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="w-fit gap-2">
        <Link to="/cliente/orcamentos">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </Button>

      <PageHeader
        title={`Orçamento ${quote.number}`}
        subtitle={quote.service}
        actions={<StatusBadge status={quote.status} className="px-3 py-1.5 text-sm" />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="surface-card p-5 sm:p-6">
            <h2 className="font-display text-base font-bold">Informações</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {rows.map(([label, value]) => (
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
            <h2 className="font-display text-base font-bold">Descrição do serviço</h2>
            <p className="mt-2 text-sm text-muted-foreground">{quote.description}</p>
            {quote.notes ? (
              <>
                <h3 className="mt-4 text-sm font-semibold">Observações</h3>
                <p className="mt-1 text-sm text-muted-foreground">{quote.notes}</p>
              </>
            ) : null}
            {quote.refusalReason ? (
              <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {quote.refusalReason}
              </p>
            ) : null}
          </section>

          <section className="surface-card p-5 sm:p-6">
            <h2 className="font-display text-base font-bold">Arquivos enviados</h2>
            {quote.files.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nenhum arquivo anexado.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {quote.files.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 truncate">{f.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{f.size}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="surface-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Valor do orçamento
            </p>
            <p className="mt-1 font-display text-3xl font-bold">
              {quote.value === null ? "A definir" : brl(quote.value)}
            </p>

            {canApprove ? (
              <Button className="mt-5 w-full gap-2" onClick={() => setConfirm(true)}>
                <CheckCircle2 className="size-4" /> Aprovar orçamento
              </Button>
            ) : null}

            {quote.status === "Aprovado" ? (
              <div className="mt-5 space-y-3">
                <p className="rounded-lg bg-success/10 px-3 py-2 text-sm font-medium text-success">
                  Orçamento aprovado.
                </p>
                <Button className="w-full gap-2" onClick={() => navigate({ to: "/cliente/pagamentos" })}>
                  <CreditCard className="size-4" /> Ir para pagamento
                </Button>
                {work ? (
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/cliente/obras/$id" params={{ id: work.id }}>
                      Acompanhar obra {work.number}
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : null}

            {quote.value === null ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Nossa equipe está analisando sua solicitação. Você será notificado quando o valor
                estiver disponível.
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar orçamento {quote.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao aprovar, uma obra será criada no valor de{" "}
              {quote.value === null ? "—" : brl(quote.value)} e o pagamento será liberado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={approve}>Aprovar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
