import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout;
});

function AdminLayout() {
  const { currentUser } = useAppStore();
  if (!currentUser) return <Navigate to="/" replace />;
  if (currentUser.role !== "admin") return <Navigate to="/cliente" replace />;
  return (
    <AppShell role="admin">
      <Outlet />
    </AppShell>
  );
}
