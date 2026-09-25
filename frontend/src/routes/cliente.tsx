import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/cliente")({
  ssr: false,
  component: ClienteLayout,
});

function ClienteLayout() {
  const { currentUser } = useAppStore();
  if (!currentUser) return <Navigate to="/" replace />;
  if (currentUser.role !== "cliente") return <Navigate to="/admin" replace />;
  return (
    <AppShell role="cliente">
      <Outlet />
    </AppShell>
  );
}
