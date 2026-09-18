import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "brand" | "success" | "warning" | "danger";

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted/70 text-wood ring-sand",
  info: "bg-info/10 text-info ring-info/20",
  brand: "bg-primary/10 text-primary ring-primary/20",
  success: "bg-success/10 text-success ring-success/20",
  warning: "bg-warning/15 text-warning-foreground ring-warning/25",
  danger: "bg-destructive/10 text-destructive ring-destructive/20",
};

const statusTone: Record<string, Tone> = {
  // orçamentos
  "Aguardando análise": "neutral",
  "Em análise": "info",
  Aprovado: "success",
  Recusado: "danger",
  Expirado: "warning",
  // obras
  Agendada: "info",
  "Em andamento": "warning",
  Concluída: "success",
  // pagamentos
  Pendente: "warning",
  Estornado: "neutral",
  // agendamentos
  Confirmado: "success",
  Realizado: "brand",
  // clientes
  Ativo: "success",
  Inativo: "neutral",
};

export function StatusBadge({
  status,
  className,
  tone,
}: {
  status: string;
  className?: string;
  tone?: Tone;
}) {
  const resolved = tone ?? statusTone[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        toneClass[resolved],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}
