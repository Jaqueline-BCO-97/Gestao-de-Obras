import { KeyRound, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskPhone } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export function ProfileForm({ role }: { role: "cliente" | "admin" }) {
  const store = useAppStore();
  const me = store.currentUser!;
  const [form, setForm] = useState({
    name: me.name,
    email: me.email,
    phone: me.phone ?? "",
    cpf: me.cpf ?? "",
    address: me.address ?? "",
    city: me.city ?? "",
    state: me.state ?? "",
  });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateProfile(form);
    toast.success("Dados atualizados com sucesso.");
  };

  const savePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 6) {
      toast.error("A nova senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (pw.next !== pw.confirm) {
      toast.error("A confirmação não coincide com a nova senha.");
      return;
    }
    const result = store.changePassword(pw.current, pw.next);
    if (!result.ok) {
      toast.error(result.message ?? "Não foi possível alterar a senha.");
      return;
    }
    setPw({ current: "", next: "", confirm: "" });
    toast.success("Senha alterada com sucesso.");
  };

  const field = (key: keyof typeof form, label: string, mask?: (v: string) => string) => (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        value={form[key]}
        onChange={(e) =>
          setForm((f) => ({ ...f, [key]: mask ? mask(e.target.value) : e.target.value }))
        }
        className="bg-card"
      />
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={save} className="surface-card space-y-5 p-5 sm:p-6">
        <h2 className="font-display text-base font-bold">
          {role === "cliente" ? "Dados pessoais e contato" : "Dados do administrador"}
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">{field("name", "Nome completo")}</div>
          {field("email", "E-mail")}
          {field("phone", "Telefone", maskPhone)}
          {role === "cliente" ? (
            <>
              {field("cpf", "CPF")}
              <div className="sm:col-span-2">{field("address", "Endereço")}</div>
              {field("city", "Cidade")}
              {field("state", "Estado")}
            </>
          ) : null}
        </div>
        <Button type="submit" className="gap-2">
          <Save className="size-4" /> Salvar alterações
        </Button>
      </form>

      <form onSubmit={savePassword} className="surface-card h-fit space-y-5 p-5 sm:p-6">
        <h2 className="font-display text-base font-bold">Alteração de senha</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current">Senha atual</Label>
            <Input
              id="current"
              type="password"
              value={pw.current}
              onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
              className="bg-card"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next">Nova senha</Label>
            <Input
              id="next"
              type="password"
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              className="bg-card"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pw">Confirmar nova senha</Label>
            <Input
              id="confirm-pw"
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              className="bg-card"
            />
          </div>
        </div>
        <Button type="submit" variant="outline" className="gap-2">
          <KeyRound className="size-4" /> Alterar senha
        </Button>
      </form>
    </div>
  );
}
