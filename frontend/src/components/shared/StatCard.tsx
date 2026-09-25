import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  brand: "border-brand/20 bg-brand/10 text-brand",
  primary: "border-primary/20 bg-primary/10 text-primary",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/15 text-warning-foreground",
  info: "border-info/20 bg-info/10 text-info",
} as const;

const rails = {
  brand: "before:bg-brand",
  primary: "before:bg-primary",
  success: "before:bg-success",
  warning: "before:bg-oak",
  info: "before:bg-info",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <div className={cn("surface-card relative flex items-start gap-4 overflow-hidden p-5 before:absolute before:inset-x-0 before:top-0 before:h-1", rails[tone], className)}>
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-lg border", tones[tone])}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 truncate font-display text-2xl font-bold">{value}</p>
        {hint ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
