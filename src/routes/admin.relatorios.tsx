import { createFileRoute } from "@tanstack/react-router";
import { Building2, CircleDollarSign, Download, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FilterSelect } from "@/components/shared/DataToolbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/relatorios")({
  component: AdminReports,
});

const PERIODS = ["Últimos 30 dias", "Últimos 90 dias", "Este ano", "Todo o período"];

function AdminReports() {
  const store = useAppStore();
  const [period, setPeriod] = useState("Todo o período");

  const works = store.works;
  const approved = store.payments.filter((p) => p.status === "Aprovado");
  const pendingPayments = store.payments.filter((p) => p.status === "Pendente");
  const revenue = approved.reduce((sum, p) => sum + p.amount, 0);
  const pendingTotal = works.reduce((sum, w) => sum + store.paymentSummary(w.id).pending, 0);

  const exportReport = () => {
    toast.success(`Relatório de "${period}" exportado (simulação).`);
  };

  const blocks = [
    {
      title: "Obras",
      items: [
        ["Total de obras", String(works.length)],
        ["Agendadas", String(works.filter((w) => w.status === "Agendada").length)],
        ["Em andamento", String(works.filter((w) => w.status === "Em andamento").length)],
        ["Concluídas", String(works.filter((w) => w.status === "Concluída").length)],
      ],
    },
    {
      title: "Financeiro",
      items: [
        ["Faturamento aprovado", brl(revenue)],
        ["Pagamentos aprovados", String(approved.length)],
        ["Pagamentos pendentes", String(pendingPayments.length)],
        ["Valor pendente", brl(pendingTotal)],
      ],
    },
    {
      title: "Clientes",
      items: [
        ["Total de clientes", String(store.clients.length)],
        ["Clientes ativos", String(store.clients.filter((c) => c.active).length)],
        ["Novos no período", String(store.clients.filter((c) => c.createdAt >= "2026-01-01").length)],
        ["Avaliações recebidas", String(works.filter((w) => w.review).length)],
      ],
    },
  ] as const;

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Visão consolidada de obras, finanças e clientes."
        actions={
          <>
            <FilterSelect value={period} onChange={setPeriod} options={PERIODS} label="Período" />
            <Button className="gap-2" onClick={exportReport}>
              <Download className="size-4" /> Exportar relatório
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Obras cadastradas" value={works.length} icon={Building2} tone="brand" />
        <StatCard label="Faturamento" value={brl(revenue)} icon={CircleDollarSign} tone="success" />
        <StatCard label="Clientes" value={store.clients.length} icon={Users} tone="info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {blocks.map((block) => (
          <section key={block.title} className="surface-card p-5 sm:p-6">
            <h2 className="font-display text-base font-bold">{block.title}</h2>
            <dl className="mt-4 space-y-3">
              {block.items.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="font-display text-sm font-bold">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Os dados são de demonstração e a exportação é simulada no front-end.
      </p>
    </>
  );
}
