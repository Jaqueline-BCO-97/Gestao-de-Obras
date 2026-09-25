import { createFileRoute } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
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
import type { ServiceType } from "@/data/types";
import { brl } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/precos")({
  component: AdminPrices,
});

function AdminPrices() {
  const store = useAppStore();
  const [editing, setEditing] = useState<ServiceType | null>(null);
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");

  const current = store.prices.find((p) => p.service === editing);

  const open = (service: ServiceType) => {
    const item = store.prices.find((p) => p.service === service);
    setEditing(service);
    setPrice(String(item?.basePrice ?? 0).replace(".", ","));
    setUnit(item?.unit ?? "serviço");
  };

  const save = () => {
    if (!editing) return;
    const value = Number(price.replace(/\./g, "").replace(",", "."));
    if (Number.isNaN(value) || value < 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    store.updatePrice(editing, value, unit.trim() || "serviço");
    toast.success(`Preço de ${editing} atualizado.`);
    setEditing(null);
  };

  return (
    <>
      <PageHeader
        title="Preços"
        subtitle="Tabela de preços base utilizada na elaboração dos orçamentos."
      />

      <div className="space-y-3 lg:hidden">
        {store.prices.map((p) => (
          <div key={p.service} className="surface-card p-4">
            <p className="font-semibold">{p.service}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {brl(p.basePrice)} / {p.unit}
              </span>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => open(p.service)}>
                <Pencil className="size-4" /> Editar
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="surface-card hidden overflow-x-auto lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serviço</TableHead>
              <TableHead>Preço base</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {store.prices.map((p) => (
              <TableRow key={p.service}>
                <TableCell className="font-semibold">{p.service}</TableCell>
                <TableCell>{brl(p.basePrice)}</TableCell>
                <TableCell className="text-muted-foreground">{p.unit}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => open(p.service)}>
                    <Pencil className="size-4" /> Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar preço</DialogTitle>
            <DialogDescription>{editing}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">Preço base (R$)</Label>
              <Input
                id="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unidade</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="m² ou serviço"
                className="bg-card"
              />
            </div>
            {current ? (
              <p className="text-xs text-muted-foreground">
                Valor atual: {brl(current.basePrice)} / {current.unit}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar preço</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
