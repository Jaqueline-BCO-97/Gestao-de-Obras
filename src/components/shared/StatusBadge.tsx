import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "brand" | "success" | "warning" | "danger";

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground ring-border",
  info: "bg-info/12 text-info ring-info/25",
  brand: "bg-brand/12 text-brand ring-brand/25",
  success: "bg-success/12 text-success ring-success/25",
  warning: "bg-warning/18 text-warning-foreground ring-warning/35",
  danger: "bg-destructive/12 text-destructive ring-destructive/25",
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
