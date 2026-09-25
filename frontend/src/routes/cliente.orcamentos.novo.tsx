import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SERVICE_TYPES, type FileRef, type ServiceType } from "@/data/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/cliente/orcamentos/novo")({
  component: NewQuote,
});

function NewQuote() {
  const store = useAppStore();
  const navigate = useNavigate();
  const [service, setService] = useState<ServiceType | "">("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState(
    `${store.currentUser?.address ?? ""}${store.currentUser?.city ? ` — ${store.currentUser.city}/${store.currentUser.state}` : ""}`,
  );
  const [desiredDate, setDesiredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<FileRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const errors = {
    service: service ? "" : "Selecione o tipo de serviço.",
    description: description.trim().length < 15 ? "Descreva o serviço com pelo menos 15 caracteres." : "",
    address: address.trim().length < 6 ? "Informe o endereço da obra." : "",
    desiredDate: desiredDate ? "" : "Escolha a data desejada.",
  };
  const invalid = Object.values(errors).some(Boolean);

  const addFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    setFiles((prev) => [
      ...prev,
      ...list.map((f) => ({
        id: `${f.name}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        size: `${Math.max(1, Math.round(f.size / 1024))} KB`,
        uploadedAt: new Date().toISOString().slice(0, 10),
        kind: f.type.startsWith("image/") ? ("foto" as const) : ("documento" as const),
      })),
    ]);
    toast.success("Arquivo anexado.");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid) {
      toast.error("Revise os campos destacados.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const quote = store.createQuote({
        service: service as ServiceType,
        description,
        address,
        desiredDate,
        notes,
        files,
      });
      setLoading(false);
      setCreated(quote.number);
      toast.success(`Orçamento ${quote.number} enviado com sucesso!`);
    }, 650);
  };

  if (created) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-success/12 text-success">
          <CheckCircle2 className="size-8" />
        </span>
        <h1 className="mt-6 font-display text-2xl font-bold">Solicitação enviada!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seu orçamento <span className="font-semibold text-foreground">{created}</span> foi criado com
          o status <span className="font-semibold text-foreground">Aguardando análise</span>. Nossa
          equipe enviará o valor em breve.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link to="/cliente/orcamentos">Ver meus orçamentos</Link>
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: "/cliente" })}>
            Voltar ao dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Novo orçamento"
        subtitle="Descreva o serviço desejado e nossa equipe enviará o valor."
      />

      <form onSubmit={submit} className="surface-card space-y-6 p-5 sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="service">Tipo de serviço</Label>
            <Select value={service} onValueChange={(v) => setService(v as ServiceType)}>
              <SelectTrigger
                id="service"
                className={cn("w-full bg-card", touched && errors.service && "border-destructive")}
              >
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {touched && errors.service ? (
              <p className="text-xs font-medium text-destructive">{errors.service}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data desejada</Label>
            <Input
              id="date"
              type="date"
              value={desiredDate}
              onChange={(e) => setDesiredDate(e.target.value)}
              className={cn("bg-card", touched && errors.desiredDate && "border-destructive")}
            />
            {touched && errors.desiredDate ? (
              <p className="text-xs font-medium text-destructive">{errors.desiredDate}</p>
            ) : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Endereço da obra</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro — Cidade/UF"
              className={cn("bg-card", touched && errors.address && "border-destructive")}
            />
            {touched && errors.address ? (
              <p className="text-xs font-medium text-destructive">{errors.address}</p>
            ) : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Descrição do serviço</Label>
            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que precisa ser feito, metragem, materiais..."
              className={cn("bg-card", touched && errors.description && "border-destructive")}
            />
            {touched && errors.description ? (
              <p className="text-xs font-medium text-destructive">{errors.description}</p>
            ) : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Horários permitidos, acesso ao local, preferências..."
              className="bg-card"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Arquivos e fotos</Label>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/40 px-4 py-8 text-center transition-colors hover:bg-muted">
            <Upload className="size-5 text-muted-foreground" />
            <span className="text-sm font-semibold">Clique para anexar fotos ou documentos</span>
            <span className="text-xs text-muted-foreground">PNG, JPG ou PDF até 10 MB</span>
            <input type="file" multiple className="hidden" onChange={addFile} />
          </label>
          {files.length > 0 ? (
            <ul className="space-y-2">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{f.size}</span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                    aria-label="Remover arquivo"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button asChild variant="outline" type="button">
            <Link to="/cliente/orcamentos">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Solicitar orçamento
          </Button>
        </div>
      </form>
    </>
  );
}
