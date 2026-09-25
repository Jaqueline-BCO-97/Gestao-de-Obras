import { createFileRoute } from "@tanstack/react-router";
import { CircleDollarSign, CreditCard, Wallet } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PaymentDialog } from "@/components/shared/PaymentDialog";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, formatDate } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/cliente/pagamentos")({
  component: ClientPayments,
});

function ClientPayments() {
  const store = useAppStore();
  const me = store.currentUser!;
  const myWorks = store.works.filter((w) => w.clientId === me.id);
  const myPayments = store.payments.filter((p) => p.clientId === me.id);
  const [paying, setPaying] = useState<{ workId: string; amount: number } | null>(null);

  const total = myWorks.reduce((s, w) => s + w.total, 0);
  const paid = myWorks.reduce((s, w) => s + store.paymentSummary(w.id).paid, 0);
  const pending = Math.max(total - paid, 0);

  return (
    <>
      <PageHeader title="Pagamentos" subtitle="Consulte valores, quite pendências e veja o histórico." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Valor total das obras" value={brl(total)} icon={Wallet} tone="primary" />
        <StatCard label="Valor já pago" value={brl(paid)} icon={CircleDollarSign} tone="success" />
        <StatCard
          label="Valor pendente"
          value={brl(pending)}
          icon={CreditCard}
          tone={pending > 0 ? "warning" : "success"}
        />
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold">Pendências por obra</h2>
        {myWorks.filter((w) => store.paymentSummary(w.id).pending > 0).length === 0 ? (
          <EmptyState
            icon={CircleDollarSign}
            title="Você está em dia!"
            description="Nenhum pagamento pendente no momento."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {myWorks
              .filter((w) => store.paymentSummary(w.id).pending > 0)
              .map((work) => {
                const summary = store.paymentSummary(work.id);
                return (
                  <div key={work.id} className="surface-card p-5">
                    <p className="text-xs font-semibold text-muted-foreground">{work.number}</p>
                    <h3 className="truncate font-display text-base font-bold">{work.name}</h3>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-semibold">{brl(summary.total)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pago</p>
                        <p className="font-semibold text-success">{brl(summary.paid)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pendente</p>
                        <p className="font-semibold text-warning-foreground">{brl(summary.pending)}</p>
                      </div>
                    </div>
                    <Button
                      className="mt-4 w-full gap-2"
                      onClick={() => setPaying({ workId: work.id, amount: summary.pending })}
                    >
                      <CreditCard className="size-4" /> Pagar {brl(summary.pending)}
                    </Button>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold">Histórico de pagamentos</h2>
        {myPayments.length === 0 ? (
          <EmptyState icon={Wallet} title="Nenhum pagamento registrado" />
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {myPayments.map((p) => (
                <div key={p.id} className="surface-card p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground">{p.id}</p>
                      <p className="truncate text-sm font-semibold">{store.workLabel(p.workId)}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {p.method} · {formatDate(p.date)}
                    </span>
                    <span className="font-semibold">{brl(p.amount)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="surface-card hidden overflow-hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transação</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold">{p.id}</TableCell>
                      <TableCell>{store.workLabel(p.workId)}</TableCell>
                      <TableCell>
                        {p.method}
                        {p.installments ? ` (${p.installments}x)` : ""}
                      </TableCell>
                      <TableCell>{formatDate(p.date)}</TableCell>
                      <TableCell>{brl(p.amount)}</TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      {paying ? (
        <PaymentDialog
          open={Boolean(paying)}
          onOpenChange={(v) => !v && setPaying(null)}
          workId={paying.workId}
          amount={paying.amount}
        />
      ) : null}
    </>
  );
}
