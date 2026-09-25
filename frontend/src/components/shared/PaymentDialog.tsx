import { Copy, CreditCard, Loader2, QrCode } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PaymentMethod } from "@/data/types";
import { brl, maskCard } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

const PIX_CODE =
  "00020126580014BR.GOV.BCB.PIX0136obramaster@pagamentos.com.br5204000053039865802BR5910OBRAMASTER6009SAO PAULO62070503***6304A1B2";

export function PaymentDialog({
  open,
  onOpenChange,
  workId,
  amount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workId: string;
  amount: number;
}) {
  const store = useAppStore();
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [installments, setInstallments] = useState("1");

  const pay = (method: PaymentMethod) => {
    if (method !== "PIX") {
      if (maskCard(card.number).length < 19 || !card.name || card.expiry.length < 5 || card.cvv.length < 3) {
        toast.error("Preencha os dados do cartão corretamente.");
        return;
      }
    }
    setProcessing(true);
    setTimeout(() => {
      const result = store.registerPayment({
        id: `TRX-${Math.floor(9000 + Math.random() * 999)}`,
        workId,
        amount,
        method,
        ...(method === "Cartão de crédito" ? { installments: Number(installments) } : {}),
      });
      setProcessing(false);
      if (!result.ok) {
        toast.error(result.message ?? "Não foi possível registrar o pagamento.");
        return;
      }
      setDone(true);
      toast.success("Pagamento registrado com sucesso!");
    }, 900);
  };

  const close = (value: boolean) => {
    onOpenChange(value);
    if (!value) setDone(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pagamento de {brl(amount)}</DialogTitle>
          <DialogDescription>
            Ambiente de demonstração — nenhuma cobrança real é efetuada.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-4 py-4 text-center">
            <p className="font-display text-lg font-bold text-success">Pagamento aprovado!</p>
            <p className="text-sm text-muted-foreground">
              O valor de {brl(amount)} foi registrado e o cliente foi notificado.
            </p>
            <Button className="w-full" onClick={() => close(false)}>
              Concluir
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="pix">
            <TabsList className="w-full">
              <TabsTrigger value="pix" className="flex-1">
                PIX
              </TabsTrigger>
              <TabsTrigger value="credito" className="flex-1">
                Crédito
              </TabsTrigger>
              <TabsTrigger value="debito" className="flex-1">
                Débito
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pix" className="space-y-4 pt-4">
              <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/40 p-5">
                <span className="grid size-40 place-items-center rounded-xl bg-card">
                  <QrCode className="size-28 text-primary" />
                </span>
                <p className="text-sm font-semibold">{brl(amount)}</p>
                <p className="text-xs text-muted-foreground">Aguardando pagamento</p>
              </div>
              <div className="space-y-2">
                <Label>Código copia e cola</Label>
                <div className="flex gap-2">
                  <Input readOnly value={PIX_CODE} className="truncate bg-card text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Copiar código PIX"
                    onClick={() => {
                      navigator.clipboard?.writeText(PIX_CODE);
                      toast.success("Código PIX copiado.");
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
              <Button className="w-full gap-2" disabled={processing} onClick={() => pay("PIX")}>
                {processing ? <Loader2 className="size-4 animate-spin" /> : null}
                Já efetuei o pagamento
              </Button>
            </TabsContent>

            {(["credito", "debito"] as const).map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor={`num-${tab}`}>Número do cartão</Label>
                  <Input
                    id={`num-${tab}`}
                    value={card.number}
                    onChange={(e) => setCard((c) => ({ ...c, number: maskCard(e.target.value) }))}
                    placeholder="0000 0000 0000 0000"
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`name-${tab}`}>Nome impresso no cartão</Label>
                  <Input
                    id={`name-${tab}`}
                    value={card.name}
                    onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
                    placeholder="MARIA S SANTOS"
                    className="bg-card"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`exp-${tab}`}>Validade</Label>
                    <Input
                      id={`exp-${tab}`}
                      value={card.expiry}
                      onChange={(e) =>
                        setCard((c) => ({
                          ...c,
                          expiry: e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 4)
                            .replace(/(\d{2})(\d)/, "$1/$2"),
                        }))
                      }
                      placeholder="MM/AA"
                      className="bg-card"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`cvv-${tab}`}>CVV</Label>
                    <Input
                      id={`cvv-${tab}`}
                      value={card.cvv}
                      onChange={(e) =>
                        setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                      }
                      placeholder="123"
                      className="bg-card"
                    />
                  </div>
                </div>
                {tab === "credito" ? (
                  <div className="space-y-2">
                    <Label>Parcelas</Label>
                    <Select value={installments} onValueChange={setInstallments}>
                      <SelectTrigger className="w-full bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 6, 10, 12].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}x de {brl(amount / n)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <Button
                  className="w-full gap-2"
                  disabled={processing}
                  onClick={() => pay(tab === "credito" ? "Cartão de crédito" : "Cartão de débito")}
                >
                  {processing ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                  Pagar {brl(amount)}
                </Button>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
