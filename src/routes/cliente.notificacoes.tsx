import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/cliente/notificacoes")({
  component: ClientNotifications,
});

function ClientNotifications() {
  const store = useAppStore();
  const mine = store.notifications.filter((n) => n.userId === store.currentUser?.id);
  const unread = mine.filter((n) => !n.read).length;

  return (
    <>
      <PageHeader
        title="Notificações"
        subtitle={`${unread} notificação(ões) não lida(s)`}
        actions={
          unread > 0 ? (
            <Button variant="outline" className="gap-2" onClick={store.markNotificationsRead}>
              <CheckCheck className="size-4" /> Marcar todas como lidas
            </Button>
          ) : undefined
        }
      />

      {mine.length === 0 ? (
        <EmptyState icon={Bell} title="Nenhuma notificação" description="Tudo tranquilo por aqui." />
      ) : (
        <ul className="space-y-3">
          {mine.map((n) => (
            <li
              key={n.id}
              className={cn("surface-card flex gap-4 p-4", !n.read && "border-brand/40 bg-accent/40")}
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl",
                  n.tone === "success" && "bg-success/12 text-success",
                  n.tone === "warning" && "bg-warning/18 text-warning-foreground",
                  n.tone === "info" && "bg-info/12 text-info",
                )}
              >
                <Bell className="size-5" />
              </span>
              <div className="min-w-0">
                <p className={cn("text-sm", !n.read && "font-semibold")}>{n.text}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(n.date)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
