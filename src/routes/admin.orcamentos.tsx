import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, FileText, XCircle } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, formatDate } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/orcamentos")({
  component: AdminQuotes,
});

const STATUS = ["Todos", "Aguardando análise", "Em análise", "Aprovado", "Recusado", "Expirado"];
const PERIODS = ["Todo o período", "Últimos 30 dias", "Últimos 90 dias", "Este ano"];
const SORTS = ["Mais recentes", "Mais antigos", "Maior valor", "Menor valor"];

function AdminQuotes() {
  const store = useAppStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [period, setPeriod] = useState("Todo o período");
  const [sort, setSort] = useState("Mais recentes");
  const [openId, setOpenId] = useState<string | null>(null);
  const [price, setPrice] = useState("");

  const days = period === "Últimos 30 dias" ? 30 : period === "Últimos 90 dias" ? 90 : null;
  const limit = days ? Date.now() - days * 86400000 : null;

  const quotes = store.quotes
    .filter((q) => (status === "Todos" ? true : q.status === status))
    .filter((q) => (limit ? new Date(q.createdAt).getTime() >= limit : true))
    .filter((q) => (period === "Este ano" ? q.createdAt.startsWith("2026") : true))
    .filter((q) =>
      `${q.number} ${q.service} ${store.clientName(q.clientId)}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (sort === "Mais antigos") return a.createdAt.localeCompare(b.createdAt);
      if (sort === "Maior valor") return (b.value ?? 0) - (a.value ?? 0);
      if (sort === "Menor valor") return (a.value ?? 0) - (b.value ?? 0);
      return b.createdAt.localeCompare(a.createdAt);
    });

  const open = store.quotes.find((q) => q.id === openId) ?? null;

  const savePrice = () => {
    if (!open) return;
    const value = Number(price.replace(",", "."));
    if (!value || value <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    store.setQuotePrice(open.id, value);
    toast.success("Preço definido e cliente notificado.");
  };

  return (
    <>
      <PageHeader
        title="Orçamentos"
        subtitle="Analise solicitações, defina valores e aprove ou recuse pedidos."
      />

      <DataToolbar search={search} onSearch={setSearch} placeholder="Buscar por cliente, número...">
        <FilterSelect value={status} onChange={setStatus} options={STATUS} label="Status" />
        <FilterSelect value={period} onChange={setPeriod} options={PERIODS} label="Período" />
        <FilterSelect value={sort} onChange={setSort} options={SORTS} label="Ordenar" />
      </DataToolbar>

      {quotes.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhum orçamento encontrado" description="Ajuste os filtros." />
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {quotes.map((q) => (
              <button
                key={q.id}
                onClick={() => {
                  setOpenId(q.id);
                  setPrice(q.value ? String(q.value) : "");
                }}
                className="surface-card w-full p-4 text-left"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">{q.number}</p>
                    <p className="truncate font-semibold">{store.clientName(q.clientId)}</p>
                    <p className="truncate text-sm text-muted-foreground">{q.service}</p>
                  </div>
                  <StatusBadge status={q.status} />
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">{formatDate(q.createdAt)}</span>
                  <span className="font-semibold">{q.value === null ? "A definir" : brl(q.value)}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="surface-card hidden overflow-hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-semibold">{q.number}</TableCell>
                    <TableCell>{store.clientName(q.clientId)}</TableCell>
                    <TableCell>{q.service}</TableCell>
                    <TableCell>{formatDate(q.createdAt)}</TableCell>
                    <TableCell>{q.value === null ? "A definir" : brl(q.value)}</TableCell>
                    <TableCell>
                      <StatusBadge status={q.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOpenId(q.id);
                          setPrice(q.value ? String(q.value) : "");
                        }}
                      >
                        Gerenciar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={Boolean(open)} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {open ? (
            <>
              <DialogHeader>
                <DialogTitle>Orçamento {open.number}</DialogTitle>
                <DialogDescription>
                  {store.clientName(open.clientId)} · {open.service}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status atual</span>
                  <StatusBadge status={open.status} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Descrição</p>
                  <p className="mt-1 text-sm">{open.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Solicitado</p>
                    <p>{formatDate(open.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Data desejada</p>
                    <p>{formatDate(open.desiredDate)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Endereço</p>
                    <p>{open.address}</p>
                  </div>
                </div>
                {open.notes ? (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Observações</p>
                    <p className="mt-1 text-sm">{open.notes}</p>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="price">Valor do orçamento (R$)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="price"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0,00"
                      className="bg-card"
                    />
                    <Button variant="outline" onClick={savePrice}>
                      Salvar preço
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="gap-2 text-destructive"
                  onClick={() => {
                    store.setQuoteStatus(open.id, "Recusado", "Recusado pela equipe técnica.");
                    toast.success("Orçamento recusado.");
                    setOpenId(null);
                  }}
                >
                  <XCircle className="size-4" /> Recusar
                </Button>
                <Button
                  className="gap-2"
                  onClick={() => {
                    if (open.value === null) {
                      toast.error("Defina o valor antes de aprovar.");
                      return;
                    }
                    store.setQuoteStatus(open.id, "Aprovado");
                    toast.success("Orçamento aprovado. Cliente notificado e obra criada.");
                    setOpenId(null);
                  }}
                >
                  <CheckCircle2 className="size-4" /> Aprovar orçamento
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
