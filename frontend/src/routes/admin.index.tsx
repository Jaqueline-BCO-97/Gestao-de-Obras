import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CalendarDays,
  CircleDollarSign,
  FileClock,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { brl, formatDateTime, monthLabel } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const store = useAppStore();

  const inProgress = store.works.filter((w) => w.status === "Em andamento").length;
  const scheduled = store.works.filter((w) => w.status === "Agendada").length;
  const done = store.works.filter((w) => w.status === "Concluída").length;
  const pendingQuotes = store.quotes.filter(
    (q) => q.status === "Aguardando análise" || q.status === "Em análise",
  ).length;
  const pendingPayments = store.payments.filter((p) => p.status === "Pendente");
  const revenue = store.payments
    .filter((p) => p.status === "Aprovado")
    .reduce((s, p) => s + p.amount, 0);

  const statusData = [
    { name: "Agendadas", value: scheduled, color: "var(--chart-2)" },
    { name: "Em andamento", value: inProgress, color: "var(--chart-4)" },
    { name: "Concluídas", value: done, color: "var(--chart-3)" },
  ];

  const monthly = Object.values(
    store.payments
      .filter((p) => p.status === "Aprovado")
      .reduce<Record<string, { month: string; total: number; key: string }>>((acc, p) => {
        const key = p.date.slice(0, 7);
        const entry = acc[key] ?? { month: monthLabel(p.date), total: 0, key };
        entry.total += p.amount;
        acc[key] = entry;
        return acc;
      }, {}),
  ).sort((a, b) => a.key.localeCompare(b.key));

  return (
    <>
      <PageHeader
        title="Painel administrativo"
        subtitle="Visão geral das obras, orçamentos e faturamento do ObraMaster."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Obras em andamento" value={inProgress} icon={Building2} tone="warning" />
        <StatCard label="Obras agendadas" value={scheduled} icon={CalendarDays} tone="info" />
        <StatCard label="Orçamentos pendentes" value={pendingQuotes} icon={FileClock} tone="brand" />
        <StatCard
          label="Pagamentos pendentes"
          value={brl(pendingPayments.reduce((s, p) => s + p.amount, 0))}
          hint={`${pendingPayments.length} transação(ões)`}
          icon={CircleDollarSign}
          tone="warning"
        />
        <StatCard label="Faturamento" value={brl(revenue)} icon={TrendingUp} tone="success" />
        <StatCard label="Clientes cadastrados" value={store.clients.length} icon={Users} tone="primary" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface-card p-5 sm:p-6">
          <h2 className="font-display text-base font-bold">Obras por status</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Obras">
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="surface-card p-5 sm:p-6">
          <h2 className="font-display text-base font-bold">Faturamento mensal</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  formatter={(v: number) => brl(v)}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--foreground)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Recebido"
                  stroke="var(--chart-2)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--chart-2)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="surface-card p-5 sm:p-6">
        <h2 className="font-display text-base font-bold">Atividades recentes</h2>
        <ul className="mt-4 divide-y">
          {store.auditLogs.slice(0, 6).map((log) => (
            <li key={log.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium">{log.description}</p>
                <p className="text-xs text-muted-foreground">
                  {log.user} · {log.entity}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(log.date)}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
