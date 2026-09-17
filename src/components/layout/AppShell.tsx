import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ScrollText,
  Tags,
  UserCircle,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "./Logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatDateTime, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

const clientNav = [
  { to: "/cliente", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/cliente/orcamentos", label: "Meus Orçamentos", icon: FileText },
  { to: "/cliente/obras", label: "Minhas Obras", icon: Building2 },
  { to: "/cliente/pagamentos", label: "Pagamentos", icon: CircleDollarSign },
  { to: "/cliente/notificacoes", label: "Notificações", icon: Bell },
  { to: "/cliente/perfil", label: "Perfil", icon: UserCircle },
] as const;

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orcamentos", label: "Orçamentos", icon: FileText },
  { to: "/admin/obras", label: "Obras", icon: Building2 },
  { to: "/admin/agendamentos", label: "Agendamentos", icon: CalendarDays },
  { to: "/admin/pagamentos", label: "Pagamentos", icon: CircleDollarSign },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/precos", label: "Preços", icon: Tags },
  { to: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/admin/auditoria", label: "Auditoria", icon: ScrollText },
  { to: "/admin/perfil", label: "Perfil", icon: UserCircle },
] as const;

function NavLinks({ role, onNavigate }: { role: "cliente" | "admin"; onNavigate?: () => void }) {
  const items = role === "cliente" ? clientNav : adminNav;
  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeOptions={{ exact: "exact" in item ? item.exact : false }}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-primary data-[status=active]:text-sidebar-primary-foreground"
        >
          <item.icon className="size-4.5 shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function SidebarContent({ role, onNavigate }: { role: "cliente" | "admin"; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-4">
      <div className="px-1 pt-1">
        <Logo onDark />
      </div>
      {role === "cliente" ? (
        <Button asChild variant="secondary" className="w-full justify-start gap-2">
          <Link to="/cliente/orcamentos/novo" onClick={onNavigate}>
            <Plus className="size-4" />
            Solicitar orçamento
          </Link>
        </Button>
      ) : null}
      <ScrollArea className="-mx-1 flex-1 px-1">
        <NavLinks role={role} onNavigate={onNavigate} />
      </ScrollArea>
      <p className="px-2 text-[11px] text-sidebar-foreground/45">
        ObraMaster · versão de demonstração
      </p>
    </div>
  );
}

function NotificationsBell() {
  const { notifications, currentUser, markNotificationsRead } = useAppStore();
  const mine = notifications.filter((n) => n.userId === currentUser?.id);
  const unread = mine.filter((n) => !n.read).length;

  return (
    <Popover onOpenChange={(open) => open && unread > 0 && markNotificationsRead()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="size-5" />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,360px)] p-0">
        <div className="border-b px-4 py-3">
          <p className="font-display text-sm font-semibold">Notificações</p>
          <p className="text-xs text-muted-foreground">{unread} não lida(s)</p>
        </div>
        <ScrollArea className="max-h-80">
          {mine.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação por aqui.
            </p>
          ) : (
            <ul className="divide-y">
              {mine.slice(0, 12).map((n) => (
                <li key={n.id} className="flex gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      n.tone === "success" && "bg-success",
                      n.tone === "warning" && "bg-warning",
                      n.tone === "info" && "bg-info",
                    )}
                  />
                  <div className="min-w-0">
                    <p className={cn("text-sm", !n.read && "font-semibold")}>{n.text}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(n.date)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({ role, children }: { role: "cliente" | "admin"; children: ReactNode }) {
  const { currentUser, logout } = useAppStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = role === "cliente" ? clientNav : adminNav;
  const current =
    [...items].sort((a, b) => b.to.length - a.to.length).find((i) => pathname.startsWith(i.to))
      ?.label ?? "Dashboard";

  const handleLogout = () => {
    logout();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="hidden border-r border-sidebar-border lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent role={role} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b bg-card/85 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] border-sidebar-border p-0">
                <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
                <SidebarContent role={role} onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {role === "cliente" ? "Área do cliente" : "Área administrativa"}
              </p>
              <p className="truncate font-display text-sm font-semibold">{current}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <NotificationsBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-muted">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                      {initials(currentUser?.name ?? "OM")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[160px] text-left sm:block">
                    <span className="block truncate text-sm font-semibold leading-tight">
                      {currentUser?.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {role === "cliente" ? "Cliente" : "Administrador"}
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{currentUser?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={role === "cliente" ? "/cliente/perfil" : "/admin/perfil"}>
                    <UserCircle className="size-4" /> Meu perfil
                  </Link>
                </DropdownMenuItem>
                {role === "cliente" ? (
                  <DropdownMenuItem asChild>
                    <Link to="/cliente/orcamentos">
                      <ClipboardList className="size-4" /> Meus orçamentos
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} variant="destructive">
                  <LogOut className="size-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
