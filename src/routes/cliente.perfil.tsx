import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProfileForm } from "@/components/shared/ProfileForm";

export const Route = createFileRoute("/cliente/perfil")({
  component: ClientProfile,
});

function ClientProfile() {
  return (
    <>
      <PageHeader title="Meu perfil" subtitle="Mantenha seus dados de contato sempre atualizados." />
      <ProfileForm role="cliente" />
    </>
  );
}
