import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  brand: "bg-brand/12 text-brand",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/18 text-warning-foreground",
  info: "bg-info/12 text-info",
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
    <div className={cn("surface-card flex items-start gap-4 p-5", className)}>
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", tones[tone])}>
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
