import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CalendarDays, CalendarPlus, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/agendamentos")({
  component: AdminSchedules,
});

const TEAMS = ["Equipe A", "Equipe B", "Equipe C"];
const TIMES = ["08:00", "09:00", "10:00", "13:00", "14:00", "15:00", "16:00"];

function AdminSchedules() {
  const store = useAppStore();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(new Date("2026-09-15"));
  const [form, setForm] = useState({ workId: "", date: "", time: "", team: "Equipe A" });

  const conflict =
    form.date && form.time ? store.hasScheduleConflict(form.date, form.time, form.team) : false;

  const scheduled = [...store.schedules].sort((a, b) => b.date.localeCompare(a.date));
  const scheduledDays = store.schedules.map((s) => new Date(`${s.date}T12:00`));

  const submit = () => {
    if (!form.workId || !form.date || !form.time) {
      toast.error("Preencha obra, data e horário.");
      return;
    }
    const work = store.works.find((w) => w.id === form.workId);
    const result = store.createSchedule({
      workId: form.workId,
      clientId: work?.clientId ?? "",
      date: form.date,
      time: form.time,
      address: work?.address ?? "",
      status: "Confirmado",
      team: form.team,
    });
    if (!result.ok) {
      toast.error(result.message ?? "Não foi possível agendar.");
      return;
    }
    toast.success("Agendamento criado e cliente notificado.");
    setOpen(false);
    setForm({ workId: "", date: "", time: "", team: "Equipe A" });
  };

  return (
    <>
      <PageHeader
        title="Agendamentos"
        subtitle="Organize as datas de execução e evite conflitos de equipe."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <CalendarPlus className="size-4" /> Agendar obra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo agendamento</DialogTitle>
                <DialogDescription>
                  Selecione a obra, a data, o horário e a equipe responsável.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Obra</Label>
                  <Select
                    value={form.workId}
                    onValueChange={(v) => setForm((f) => ({ ...f, workId: v }))}
                  >
                    <SelectTrigger className="w-full bg-card">
                      <SelectValue placeholder="Selecione a obra" />
                    </SelectTrigger>
                    <SelectContent>
                      {store.works
                        .filter((w) => w.status !== "Concluída")
                        .map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.number} — {store.clientName(w.clientId)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sdate">Data</Label>
                    <Input
                      id="sdate"
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                      className="bg-card"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Horário</Label>
                    <Select value={form.time} onValueChange={(v) => setForm((f) => ({ ...f, time: v }))}>
                      <SelectTrigger className="w-full bg-card">
                        <SelectValue placeholder="--:--" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Equipe</Label>
                  <Select value={form.team} onValueChange={(v) => setForm((f) => ({ ...f, team: v }))}>
                    <SelectTrigger className="w-full bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAMS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {conflict ? (
                  <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    Conflito de horário: a {form.team} já possui um serviço em {formatDate(form.date)} às{" "}
                    {form.time}.
                  </p>
                ) : null}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={submit} disabled={conflict}>
                  Confirmar agendamento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[auto_minmax(0,1fr)]">
        <section className="surface-card w-fit p-4">
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            modifiers={{ scheduled: scheduledDays }}
            modifiersClassNames={{ scheduled: "bg-brand/15 text-brand font-bold rounded-md" }}
          />
          <p className="mt-2 px-2 text-xs text-muted-foreground">
            Dias destacados possuem serviços agendados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">Lista de agendamentos</h2>
          {scheduled.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nenhum agendamento" />
          ) : (
            scheduled.map((s) => (
              <div key={s.id} className="surface-card p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{store.workLabel(s.workId)}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {store.clientName(s.clientId)} · {s.team}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-4" /> {formatDate(s.date)} às {s.time}
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <MapPin className="size-4 shrink-0" />
                    <span className="truncate">{s.address}</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </>
  );
}
