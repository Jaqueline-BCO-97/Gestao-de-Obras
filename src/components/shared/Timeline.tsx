import { Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineStep {
  label: string;
  state: "done" | "current" | "todo";
  hint?: string;
}

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="relative space-y-6 pl-2">
      {steps.map((step, index) => (
        <li key={step.label} className="relative flex gap-4">
          {index < steps.length - 1 ? (
            <span
              aria-hidden
              className={cn(
                "absolute left-[13px] top-7 h-[calc(100%+0.6rem)] w-0.5 rounded",
                step.state === "done" ? "bg-oak/45" : "bg-border",
              )}
            />
          ) : null}
          <span
            className={cn(
              "z-10 grid size-7 shrink-0 place-items-center rounded-full ring-4 ring-card",
               step.state === "done" && "bg-brand text-brand-foreground",
               step.state === "current" && "bg-primary text-primary-foreground",
              step.state === "todo" && "bg-muted text-muted-foreground",
            )}
          >
            {step.state === "done" ? (
              <Check className="size-4" />
            ) : step.state === "current" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Circle className="size-3" />
            )}
          </span>
          <div className="min-w-0 pt-0.5">
            <p
              className={cn(
                "text-sm font-semibold",
                step.state === "todo" && "text-muted-foreground",
              )}
            >
              {step.label}
            </p>
            {step.hint ? <p className="text-xs text-muted-foreground">{step.hint}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
