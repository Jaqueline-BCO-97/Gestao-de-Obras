import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { maskCPF, maskPhone, onlyDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/cadastro")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Criar conta de cliente — ObraMaster" },
      {
        name: "description",
        content:
          "Cadastre-se no ObraMaster para solicitar orçamentos, acompanhar obras e efetuar pagamentos.",
      },
      { property: "og:title", content: "Criar conta de cliente — ObraMaster" },
      {
        property: "og:description",
        content: "Cadastre-se para solicitar orçamentos e acompanhar suas obras no ObraMaster.",
      },
    ],
  }),
  component: RegisterPage,
});

const STATES = ["SP", "RJ", "MG", "PR", "SC", "RS", "BA", "PE", "CE", "GO", "DF"];

interface FormState {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  password: string;
  confirm: string;
}

const empty: FormState = {
  name: "",
  cpf: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  password: "",
  confirm: "",
};

function RegisterPage() {
  const { register } = useAppStore();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(empty);
  const [accept, setAccept] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const errors: Partial<Record<keyof FormState | "accept", string>> = {};
  if (form.name.trim().length < 5) errors.name = "Informe o nome completo.";
  if (onlyDigits(form.cpf).length !== 11) errors.cpf = "CPF deve conter 11 dígitos.";
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "E-mail inválido.";
  if (onlyDigits(form.phone).length < 10) errors.phone = "Telefone inválido.";
  if (form.address.trim().length < 5) errors.address = "Informe o endereço.";
  if (!form.city.trim()) errors.city = "Informe a cidade.";
  if (!form.state) errors.state = "Selecione o estado.";
  if (form.password.length < 6) errors.password = "Mínimo de 6 caracteres.";
  if (form.confirm !== form.password) errors.confirm = "As senhas não coincidem.";
  if (!accept) errors.accept = "É necessário aceitar os termos.";

  const set = (key: keyof FormState) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(
      Object.keys(form).reduce((acc, k) => ({ ...acc, [k]: true }), { accept: true } as Record<string, boolean>),
    );
    if (Object.keys(errors).length > 0) {
      toast.error("Revise os campos destacados.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const result = register({
        name: form.name,
        cpf: form.cpf,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        state: form.state,
        password: form.password,
      });
      setLoading(false);
      if (!result.ok) {
        toast.error(result.message ?? "Não foi possível concluir o cadastro.");
        return;
      }
      toast.success("Cadastro realizado com sucesso!");
      navigate({ to: "/cliente" });
    }, 600);
  };

  const field = (
    key: keyof FormState,
    label: string,
    props: { placeholder?: string; type?: string; mask?: (v: string) => string } = {},
  ) => {
    const invalid = touched[key] && errors[key];
    return (
      <div className="space-y-2">
        <Label htmlFor={key}>{label}</Label>
        <Input
          id={key}
          type={props.type ?? "text"}
          placeholder={props.placeholder}
          value={form[key]}
          onBlur={() => setTouched((t) => ({ ...t, [key]: true }))}
          onChange={(e) => set(key)(props.mask ? props.mask(e.target.value) : e.target.value)}
          className={cn("bg-card", invalid && "border-destructive focus-visible:ring-destructive/30")}
          aria-invalid={Boolean(invalid)}
        />
        {invalid ? <p className="text-xs font-medium text-destructive">{errors[key]}</p> : null}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="auth-gradient px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Logo onDark />
          <Button asChild variant="ghost" size="sm" className="text-sidebar-foreground">
            <Link to="/">
              <ArrowLeft className="size-4" /> Voltar
            </Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <h1 className="font-display text-3xl font-bold">Cadastro de cliente</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Preencha seus dados para solicitar orçamentos e acompanhar suas obras.
        </p>

        <form onSubmit={submit} className="surface-card mt-6 space-y-6 p-5 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">{field("name", "Nome completo", { placeholder: "Maria Silva Santos" })}</div>
            {field("cpf", "CPF", { placeholder: "000.000.000-00", mask: maskCPF })}
            {field("email", "E-mail", { placeholder: "seu@email.com", type: "email" })}
            {field("phone", "Telefone", { placeholder: "(11) 99999-9999", mask: maskPhone })}
            {field("address", "Endereço", { placeholder: "Rua, número, complemento" })}
            {field("city", "Cidade", { placeholder: "São Paulo" })}
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Select value={form.state} onValueChange={set("state")}>
                <SelectTrigger
                  id="state"
                  className={cn("w-full bg-card", touched["state"] && errors.state && "border-destructive")}
                >
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched["state"] && errors.state ? (
                <p className="text-xs font-medium text-destructive">{errors.state}</p>
              ) : null}
            </div>
            {field("password", "Senha", { type: "password", placeholder: "••••••••" })}
            {field("confirm", "Confirmação de senha", { type: "password", placeholder: "••••••••" })}
          </div>

          <label className="flex items-start gap-3 rounded-lg bg-muted/60 p-3 text-sm">
            <Checkbox
              checked={accept}
              onCheckedChange={(v) => {
                setAccept(Boolean(v));
                setTouched((t) => ({ ...t, accept: true }));
              }}
              className="mt-0.5"
              aria-label="Aceitar termos"
            />
            <span className="text-muted-foreground">
              Declaro que li e aceito os <span className="font-semibold text-foreground">termos de uso</span> e a{" "}
              <span className="font-semibold text-foreground">política de privacidade</span> do ObraMaster.
            </span>
          </label>
          {touched["accept"] && errors.accept ? (
            <p className="-mt-4 text-xs font-medium text-destructive">{errors.accept}</p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button asChild variant="outline">
              <Link to="/">Já tenho conta</Link>
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Criar minha conta
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
