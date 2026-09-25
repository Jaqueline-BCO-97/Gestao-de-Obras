import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  size = "md",
  className,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim = size === "lg" ? "size-8" : size === "sm" ? "size-4" : "size-6";
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;
        const star = (
          <Star
            className={cn(dim, active ? "fill-warning text-warning" : "text-muted-foreground/50")}
          />
        );
        return onChange ? (
          <button
            key={n}
            type="button"
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            onClick={() => onChange(n)}
            className="rounded transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring"
          >
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}
