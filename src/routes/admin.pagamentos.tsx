import { createFileRoute } from "@tanstack/react-router";
import { CircleDollarSign, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataToolbar, FilterSelect } from "@/components/shared/DataToolbar";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PaymentMethod } from "@/data/types";
import { brl, formatDate } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/pagamentos")({
  component: AdminPayments,
});

const METHODS: PaymentMethod[] = ["PIX", "Cartão de crédito", "Cartão de débito"];

function AdminPayments() {
  const store = useAppStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ id: "", workId: "", amount: "", method: "PIX" as PaymentMethod });
  const [duplicate, setDuplicate] = useState<string | null>(null);

  const payments = store.payments
    .filter((p) => (status === "Todos" ? true : p.status === status))
    .filter((p) =>
      `${p.id} ${store.clientName(p.clientId)} ${store.workLabel(p.workId)}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );

  const submit = () => {
    const amount = Number(form.amount.replace(",", "."));
    if (!form.id || !form.workId || !amount) {
      toast.error("Preencha o identificador, a obra e o valor.");
      return;
    }
    const result = store.registerPayment({
      id: form.id,
      workId: form.workId,
      amount,
      method: form.method,
    });
    if (!result.ok) {
      setDuplicate(result.message ?? "Não foi possível registrar.");
      return;
    }
    toast.success("Pagamento registrado.");
    setOpen(false);
    setDuplicate(null);
    setForm({ id: "", workId: "", amount: "", method: "PIX" });
  };

  return (
    <>
      <PageHeader
        title="Pagamentos"
        subtitle="Registre transações e acompanhe o status financeiro das obras."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" /> Registrar transação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar transação</DialogTitle>
                <DialogDescription>
                  O identificador deve ser único — transações duplicadas são bloqueadas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="trx">Identificador da transação</Label>
                  <Input
                    id="trx"
                    value={form.id}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, id: e.target.value }));
                      setDuplicate(null);
                    }}
                    placeholder="TRX-9001"
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Obra</Label>
                  <Select value={form.workId} onValueChange={(v) => setForm((f) => ({ ...f, workId: v }))}>
                    <SelectTrigger className="w-full bg-card">
                      <SelectValue placeholder="Selecione a obra" />
                    </SelectTrigger>
                    <SelectContent>
                      {store.works.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.number} — {store.clientName(w.clientId)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor (R$)</Label>
                    <Input
                      id="amount"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="0,00"
                      className="bg-card"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Método</Label>
                    <Select
                      value={form.method}
                      onValueChange={(v) => setForm((f) => ({ ...f, method: v as PaymentMethod }))}
                    >
                      <SelectTrigger className="w-full bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {duplicate ? (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                    {duplicate}
                  </p>
                ) : null}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={submit}>Registrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <DataToolbar search={search} onSearch={setSearch} placeholder="Buscar transação, cliente...">
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={["Todos", "Pendente", "Aprovado", "Recusado", "Estornado"]}
          label="Status"
        />
      </DataToolbar>

      {payments.length === 0 ? (
        <EmptyState icon={CircleDollarSign} title="Nenhuma transação encontrada" />
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {payments.map((p) => (
              <div key={p.id} className="surface-card p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">{p.id}</p>
                    <p className="truncate font-semibold">{store.clientName(p.clientId)}</p>
                    <p className="truncate text-sm text-muted-foreground">{store.workLabel(p.workId)}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {p.method} · {formatDate(p.date)}
                  </span>
                  <span className="font-semibold">{brl(p.amount)}</span>
                </div>
                {p.status === "Pendente" ? (
                  <Button size="sm" className="mt-3 w-full" onClick={() => store.approvePayment(p.id)}>
                    Aprovar pagamento
                  </Button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="surface-card hidden overflow-x-auto lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transação</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold">{p.id}</TableCell>
                    <TableCell>{store.clientName(p.clientId)}</TableCell>
                    <TableCell>{store.workLabel(p.workId)}</TableCell>
                    <TableCell>{brl(p.amount)}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell>{formatDate(p.date)}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {p.status === "Pendente" ? (
                        <Button size="sm" variant="outline" onClick={() => store.approvePayment(p.id)}>
                          Aprovar
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </>
  );
}
