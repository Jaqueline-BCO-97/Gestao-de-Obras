import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProfileForm } from "@/components/shared/ProfileForm";

export const Route = createFileRoute("/admin/perfil")({
  component: AdminProfile,
});

function AdminProfile() {
  return (
    <>
      <PageHeader title="Meu perfil" subtitle="Dados do administrador e segurança da conta." />
      <ProfileForm role="admin" />
    </>
  );
}
