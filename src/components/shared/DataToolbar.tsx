import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function DataToolbar({
  search,
  onSearch,
  placeholder = "Buscar...",
  children,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="bg-card pl-9"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">{children}</div>
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  label,
  className = "w-full sm:w-[190px]",
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`bg-card ${className}`} aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
