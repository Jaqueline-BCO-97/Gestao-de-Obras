import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Building2, Loader2, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — ObraMaster" },
      {
        name: "description",
        content:
          "Acesse o ObraMaster para gerenciar orçamentos, obras, agendamentos e pagamentos em um só lugar.",
      },
      { property: "og:title", content: "Entrar — ObraMaster" },
      {
        property: "og:description",
        content: "Acesse o ObraMaster para gerenciar orçamentos, obras, agendamentos e pagamentos.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAppStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Informe e-mail e senha para continuar.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const result = login(email, password);
      setLoading(false);
      if (!result.ok) {
        setError(result.message ?? "Não foi possível entrar.");
        return;
      }
      toast.success("Bem-vindo ao ObraMaster!");
      navigate({ to: result.role === "admin" ? "/admin" : "/cliente" });
    }, 550);
  };

  const fill = (kind: "cliente" | "admin") => {
    setEmail(kind === "admin" ? "admin@obramaster.com" : "cliente@obramaster.com");
    setPassword(kind === "admin" ? "admin123" : "cliente123");
    setError(null);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="auth-gradient relative hidden flex-col justify-between p-10 lg:flex">
        <Logo onDark />
        <div className="max-w-md space-y-6 text-sidebar-foreground">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Todo o ciclo da sua obra em uma única plataforma.
          </h2>
          <ul className="space-y-3 text-sm text-sidebar-foreground/80">
            {[
              { icon: Sparkles, text: "Orçamentos digitais com aprovação em poucos cliques" },
              { icon: Building2, text: "Acompanhamento de execução com timeline e progresso" },
              { icon: ShieldCheck, text: "Pagamentos, relatórios e auditoria centralizados" },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-accent">
                  <item.icon className="size-4" />
                </span>
                <span className="pt-1.5">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-sidebar-foreground/50">
          ObraMaster © 2026 · Sistema de gestão de obras e reformas
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="font-display text-3xl font-bold">Bem-vindo ao ObraMaster</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre com suas credenciais para acessar o painel de gestão.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-card pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-card pl-9"
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setRemember(Boolean(v))}
                  aria-label="Lembrar de mim"
                />
                Lembrar de mim
              </label>
              <button
                type="button"
                onClick={() => toast.info("Enviamos um link de redefinição para o seu e-mail.")}
                className="text-sm font-semibold text-brand hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>

            <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {loading ? "Entrando..." : "Entrar"}
              {!loading ? <ArrowRight className="size-4" /> : null}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <Link to="/cadastro" className="font-semibold text-brand hover:underline">
              Cadastre-se como cliente
            </Link>
          </p>

          <div className="mt-8 rounded-xl border border-dashed bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Acessos de demonstração
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" size="sm" onClick={() => fill("cliente")}>
                Entrar como Cliente
              </Button>
              <Button variant="outline" size="sm" onClick={() => fill("admin")}>
                Entrar como Admin
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              cliente@obramaster.com / cliente123 · admin@obramaster.com / admin123
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
