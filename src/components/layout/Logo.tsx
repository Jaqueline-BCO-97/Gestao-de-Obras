import { HardHat } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl",
          onDark ? "bg-brand text-brand-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        <HardHat className="size-5" />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate font-display text-lg font-bold leading-tight",
            onDark ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          Obra<span className="text-brand">Master</span>
        </span>
        <span
          className={cn(
            "block text-[10px] font-semibold uppercase tracking-[0.18em]",
            onDark ? "text-sidebar-foreground/60" : "text-muted-foreground",
          )}
        >
          Gestão de obras
        </span>
      </span>
    </span>
  );
}
