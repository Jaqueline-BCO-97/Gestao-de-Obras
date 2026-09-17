import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import * as seed from "@/data/mock";
import type {
  AuditLog,
  FileRef,
  Notification,
  Payment,
  PaymentMethod,
  Quote,
  QuoteStatus,
  Schedule,
  ServicePrice,
  ServiceType,
  User,
  Work,
  WorkStatus,
} from "@/data/types";

/**
 * Camada de estado da aplicação (dados mockados).
 * Toda leitura/escrita de dados passa por aqui, de modo que a substituição
 * por uma API REST exija apenas trocar o corpo das funções deste provider.
 */

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
const nowISO = () => new Date().toISOString().slice(0, 16);
const todayISO = () => new Date().toISOString().slice(0, 10);

export interface ActionResult {
  ok: boolean;
  message?: string;
}

interface AppState {
  currentUser: User | null;
  users: User[];
  quotes: Quote[];
  works: Work[];
  payments: Payment[];
  schedules: Schedule[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  prices: ServicePrice[];
}

interface AppStore extends AppState {
  clients: User[];
  login: (email: string, password: string) => ActionResult & { role?: User["role"] };
  logout: () => void;
  register: (data: Omit<User, "id" | "role" | "createdAt" | "active">) => ActionResult;
  updateProfile: (data: Partial<User>) => void;
  changePassword: (current: string, next: string) => ActionResult;
  // orçamentos
  createQuote: (input: {
    service: ServiceType;
    description: string;
    address: string;
    desiredDate: string;
    notes?: string;
    files: FileRef[];
  }) => Quote;
  setQuotePrice: (quoteId: string, value: number) => void;
  setQuoteStatus: (quoteId: string, status: QuoteStatus, reason?: string) => void;
  clientApproveQuote: (quoteId: string) => ActionResult;
  // obras
  changeWorkStatus: (workId: string, status: WorkStatus) => ActionResult;
  setWorkProgress: (workId: string, progress: number) => void;
  addWorkFile: (workId: string, file: FileRef) => void;
  addReview: (workId: string, rating: number, comment: string) => ActionResult;
  // pagamentos
  registerPayment: (input: {
    id: string;
    workId: string;
    amount: number;
    method: PaymentMethod;
    installments?: number;
    status?: Payment["status"];
  }) => ActionResult;
  approvePayment: (paymentId: string) => void;
  paymentSummary: (workId: string) => { total: number; paid: number; pending: number };
  hasPendingPayment: (workId: string) => boolean;
  // agendamentos
  hasScheduleConflict: (date: string, time: string, team: string, ignoreId?: string) => boolean;
  createSchedule: (input: Omit<Schedule, "id">) => ActionResult;
  // notificações
  markNotificationsRead: () => void;
  // preços
  updatePrice: (service: ServiceType, basePrice: number, unit: string) => void;
  // utilitários
  clientName: (clientId: string) => string;
  workLabel: (workId: string) => string;
}

const AppContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    users: seed.users,
    quotes: seed.quotes,
    works: seed.works,
    payments: seed.payments,
    schedules: seed.schedules,
    notifications: seed.notifications,
    auditLogs: seed.auditLogs,
    prices: seed.servicePrices,
  });

  const patch = useCallback((fn: (s: AppState) => AppState) => setState((s) => fn(s)), []);

  const notify = (s: AppState, userId: string, text: string, tone: Notification["tone"] = "info") => ({
    ...s,
    notifications: [
      { id: uid("n"), userId, text, date: nowISO(), read: false, tone },
      ...s.notifications,
    ],
  });

  const audit = (s: AppState, action: string, entity: string, description: string) => ({
    ...s,
    auditLogs: [
      {
        id: uid("a"),
        date: nowISO(),
        user: s.currentUser?.name ?? "Sistema",
        action,
        entity,
        description,
      },
      ...s.auditLogs,
    ],
  });

  const addUpdate = (work: Work, text: string): Work => ({
    ...work,
    updates: [...work.updates, { id: uid("wu"), date: nowISO(), text }],
  });

  const store = useMemo<AppStore>(() => {
    const paymentSummary = (workId: string) => {
      const work = state.works.find((w) => w.id === workId);
      const total = work?.total ?? 0;
      const paid = state.payments
        .filter((p) => p.workId === workId && p.status === "Aprovado")
        .reduce((sum, p) => sum + p.amount, 0);
      return { total, paid, pending: Math.max(total - paid, 0) };
    };

    const hasPendingPayment = (workId: string) => paymentSummary(workId).pending > 0;

    const hasScheduleConflict = (date: string, time: string, team: string, ignoreId?: string) =>
      state.schedules.some(
        (s) => s.id !== ignoreId && s.date === date && s.time === time && s.team === team,
      );

    return {
      ...state,
      clients: state.users.filter((u) => u.role === "cliente"),

      login: (email, password) => {
        const user = state.users.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
        );
        if (!user) return { ok: false, message: "E-mail ou senha inválidos." };
        patch((s) => ({ ...s, currentUser: user }));
        return { ok: true, role: user.role };
      },

      logout: () => patch((s) => ({ ...s, currentUser: null })),

      register: (data) => {
        if (state.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
          return { ok: false, message: "Este e-mail já está cadastrado." };
        }
        const user: User = {
          ...data,
          id: uid("u"),
          role: "cliente",
          createdAt: todayISO(),
          active: true,
        };
        patch((s) =>
          audit(
            { ...s, users: [...s.users, user], currentUser: user },
            "Criou conta",
            `Cliente ${user.name}`,
            `Novo cliente ${user.name} cadastrado na plataforma.`,
          ),
        );
        return { ok: true };
      },

      updateProfile: (data) =>
        patch((s) => {
          if (!s.currentUser) return s;
          const updated = { ...s.currentUser, ...data };
          return {
            ...s,
            currentUser: updated,
            users: s.users.map((u) => (u.id === updated.id ? updated : u)),
          };
        }),

      changePassword: (current, next) => {
        if (!state.currentUser) return { ok: false, message: "Sessão expirada." };
        if (state.currentUser.password !== current)
          return { ok: false, message: "A senha atual está incorreta." };
        patch((s) => {
          if (!s.currentUser) return s;
          const updated = { ...s.currentUser, password: next };
          return {
            ...s,
            currentUser: updated,
            users: s.users.map((u) => (u.id === updated.id ? updated : u)),
          };
        });
        return { ok: true };
      },

      createQuote: (input) => {
        const client = state.currentUser;
        const number = `ORC-${2049 + state.quotes.length}`;
        const quote: Quote = {
          id: uid("q"),
          number,
          clientId: client?.id ?? "u-1",
          service: input.service,
          description: input.description,
          address: input.address,
          desiredDate: input.desiredDate,
          notes: input.notes,
          value: null,
          status: "Aguardando análise",
          createdAt: todayISO(),
          files: input.files,
        };
        patch((s) => {
          let next = { ...s, quotes: [quote, ...s.quotes] };
          next = notify(next, "u-admin", `Novo orçamento ${number} aguardando análise.`);
          next = notify(
            next,
            quote.clientId,
            `Recebemos sua solicitação ${number}. Em breve enviaremos o valor.`,
          );
          return audit(
            next,
            "Criou orçamento",
            `Orçamento ${number}`,
            `Cliente solicitou orçamento de ${quote.service}.`,
          );
        });
        return quote;
      },

      setQuotePrice: (quoteId, value) =>
        patch((s) => {
          const quote = s.quotes.find((q) => q.id === quoteId);
          if (!quote) return s;
          let next = {
            ...s,
            quotes: s.quotes.map((q) =>
              q.id === quoteId
                ? { ...q, value, status: q.status === "Aguardando análise" ? "Em análise" : q.status }
                : q,
            ),
          };
          next = notify(
            next,
            quote.clientId,
            `O valor do orçamento ${quote.number} foi definido. Confira os detalhes.`,
          );
          return audit(
            next,
            "Definiu preço",
            `Orçamento ${quote.number}`,
            `Administrador definiu o valor do orçamento ${quote.number}.`,
          );
        }),

      setQuoteStatus: (quoteId, status, reason) =>
        patch((s) => {
          const quote = s.quotes.find((q) => q.id === quoteId);
          if (!quote) return s;
          let next: AppState = {
            ...s,
            quotes: s.quotes.map((q) =>
              q.id === quoteId ? { ...q, status, refusalReason: reason ?? q.refusalReason } : q,
            ),
          };

          if (status === "Aprovado") {
            const number = `OBR-${1030 + s.works.length}`;
            const work: Work = {
              id: uid("w"),
              number,
              name: `${quote.service} — ${quote.address.split("—")[0].trim()}`,
              clientId: quote.clientId,
              quoteId: quote.id,
              service: quote.service,
              address: quote.address,
              total: quote.value ?? 0,
              startDate: quote.desiredDate,
              endDate: quote.desiredDate,
              responsible: "Eng. Rafael Torres",
              status: "Agendada",
              progress: 0,
              updates: [{ id: uid("wu"), date: nowISO(), text: "Orçamento aprovado." }],
              files: [],
            };
            next = { ...next, works: [work, ...next.works] };
            next = notify(
              next,
              quote.clientId,
              `Seu orçamento ${quote.number} foi aprovado. A obra ${number} foi criada.`,
              "success",
            );
          } else if (status === "Recusado") {
            next = notify(next, quote.clientId, `Seu orçamento ${quote.number} foi recusado.`, "warning");
          } else {
            next = notify(next, quote.clientId, `Orçamento ${quote.number} agora está ${status}.`);
          }

          return audit(
            next,
            `Orçamento ${status}`,
            `Orçamento ${quote.number}`,
            `Status do orçamento ${quote.number} alterado para ${status}.`,
          );
        }),

      clientApproveQuote: (quoteId) => {
        const quote = state.quotes.find((q) => q.id === quoteId);
        if (!quote) return { ok: false, message: "Orçamento não encontrado." };
        if (quote.value === null)
          return { ok: false, message: "Aguarde a definição do valor pela equipe." };
        patch((s) => {
          let next: AppState = {
            ...s,
            quotes: s.quotes.map((q) =>
              q.id === quoteId ? { ...q, status: "Aprovado", clientApproved: true } : q,
            ),
          };
          const exists = s.works.some((w) => w.quoteId === quoteId);
          if (!exists) {
            const number = `OBR-${1030 + s.works.length}`;
            next = {
              ...next,
              works: [
                {
                  id: uid("w"),
                  number,
                  name: `${quote.service} — ${quote.address.split("—")[0].trim()}`,
                  clientId: quote.clientId,
                  quoteId: quote.id,
                  service: quote.service,
                  address: quote.address,
                  total: quote.value ?? 0,
                  startDate: quote.desiredDate,
                  endDate: quote.desiredDate,
                  responsible: "Eng. Rafael Torres",
                  status: "Agendada",
                  progress: 0,
                  updates: [{ id: uid("wu"), date: nowISO(), text: "Orçamento aprovado pelo cliente." }],
                  files: [],
                },
                ...next.works,
              ],
            };
          }
          next = notify(next, "u-admin", `Cliente aprovou o orçamento ${quote.number}.`, "success");
          next = notify(
            next,
            quote.clientId,
            `Orçamento ${quote.number} aprovado. Realize o pagamento para iniciarmos.`,
            "success",
          );
          return audit(
            next,
            "Aprovou orçamento",
            `Orçamento ${quote.number}`,
            `Cliente aprovou orçamento ${quote.number}.`,
          );
        });
        return { ok: true };
      },

      changeWorkStatus: (workId, status) => {
        const work = state.works.find((w) => w.id === workId);
        if (!work) return { ok: false, message: "Obra não encontrada." };

        const flow: WorkStatus[] = ["Agendada", "Em andamento", "Concluída"];
        const from = flow.indexOf(work.status);
        const to = flow.indexOf(status);
        if (to !== from + 1) {
          return {
            ok: false,
            message: `Transição inválida: a obra deve seguir o fluxo Agendada → Em andamento → Concluída.`,
          };
        }
        if (status === "Concluída" && hasPendingPayment(workId)) {
          return {
            ok: false,
            message: "Não é possível concluir esta obra enquanto houver pagamentos pendentes.",
          };
        }

        patch((s) => {
          let next: AppState = {
            ...s,
            works: s.works.map((w) =>
              w.id === workId
                ? addUpdate(
                    { ...w, status, progress: status === "Concluída" ? 100 : Math.max(w.progress, 10) },
                    `Obra atualizada para ${status}.`,
                  )
                : w,
            ),
          };
          next = notify(
            next,
            work.clientId,
            status === "Concluída"
              ? `Sua obra ${work.number} foi concluída. Avalie o serviço!`
              : `Sua obra ${work.number} está ${status.toLowerCase()}.`,
            status === "Concluída" ? "success" : "info",
          );
          return audit(
            next,
            "Alterou status",
            `Obra ${work.number}`,
            `Administrador alterou o status da obra ${work.number} para ${status}.`,
          );
        });
        return { ok: true };
      },

      setWorkProgress: (workId, progress) =>
        patch((s) => ({
          ...s,
          works: s.works.map((w) => (w.id === workId ? { ...w, progress } : w)),
        })),

      addWorkFile: (workId, file) =>
        patch((s) => {
          const work = s.works.find((w) => w.id === workId);
          if (!work) return s;
          return audit(
            {
              ...s,
              works: s.works.map((w) =>
                w.id === workId ? { ...w, files: [file, ...w.files] } : w,
              ),
            },
            "Enviou arquivo",
            `Obra ${work.number}`,
            `Arquivo ${file.name} enviado para a obra ${work.number}.`,
          );
        }),

      addReview: (workId, rating, comment) => {
        const work = state.works.find((w) => w.id === workId);
        if (!work) return { ok: false, message: "Obra não encontrada." };
        if (work.status !== "Concluída")
          return { ok: false, message: "A avaliação fica disponível após a conclusão da obra." };
        if (hasPendingPayment(workId))
          return { ok: false, message: "Quite os pagamentos pendentes para avaliar a obra." };
        patch((s) => {
          const next: AppState = {
            ...s,
            works: s.works.map((w) =>
              w.id === workId ? { ...w, review: { rating, comment, date: todayISO() } } : w,
            ),
          };
          return audit(
            notify(next, "u-admin", `Nova avaliação recebida na obra ${work.number}.`, "success"),
            "Avaliou obra",
            `Obra ${work.number}`,
            `Cliente avaliou a obra ${work.number} com ${rating} estrela(s).`,
          );
        });
        return { ok: true };
      },

      registerPayment: (input) => {
        if (state.payments.some((p) => p.id.toLowerCase() === input.id.trim().toLowerCase())) {
          return { ok: false, message: "Esta transação já foi registrada." };
        }
        const work = state.works.find((w) => w.id === input.workId);
        if (!work) return { ok: false, message: "Selecione uma obra válida." };

        const payment: Payment = {
          id: input.id.trim(),
          clientId: work.clientId,
          workId: work.id,
          amount: input.amount,
          method: input.method,
          installments: input.installments,
          date: todayISO(),
          status: input.status ?? "Aprovado",
        };
        patch((s) => {
          let next: AppState = { ...s, payments: [payment, ...s.payments] };
          if (payment.status === "Aprovado") {
            next = {
              ...next,
              works: next.works.map((w) =>
                w.id === work.id ? addUpdate(w, "Pagamento confirmado.") : w,
              ),
            };
            next = notify(
              next,
              work.clientId,
              `Pagamento de ${payment.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} recebido com sucesso.`,
              "success",
            );
          }
          return audit(
            next,
            "Registrou pagamento",
            `Pagamento ${payment.id}`,
            `Pagamento ${payment.id} registrado para a obra ${work.number}.`,
          );
        });
        return { ok: true };
      },

      approvePayment: (paymentId) =>
        patch((s) => {
          const payment = s.payments.find((p) => p.id === paymentId);
          if (!payment) return s;
          const work = s.works.find((w) => w.id === payment.workId);
          let next: AppState = {
            ...s,
            payments: s.payments.map((p) => (p.id === paymentId ? { ...p, status: "Aprovado" } : p)),
          };
          if (work) {
            next = {
              ...next,
              works: next.works.map((w) =>
                w.id === work.id ? addUpdate(w, "Pagamento confirmado.") : w,
              ),
            };
          }
          next = notify(next, payment.clientId, `Pagamento ${payment.id} confirmado.`, "success");
          return audit(
            next,
            "Aprovou pagamento",
            `Pagamento ${payment.id}`,
            `Administrador aprovou o pagamento ${payment.id}.`,
          );
        }),

      paymentSummary,
      hasPendingPayment,
      hasScheduleConflict,

      createSchedule: (input) => {
        if (hasScheduleConflict(input.date, input.time, input.team)) {
          return {
            ok: false,
            message: `Conflito de agendamento: a ${input.team} já possui um serviço em ${input.date} às ${input.time}.`,
          };
        }
        const work = state.works.find((w) => w.id === input.workId);
        patch((s) => {
          let next: AppState = {
            ...s,
            schedules: [{ ...input, id: uid("s") }, ...s.schedules],
          };
          if (work) {
            next = {
              ...next,
              works: next.works.map((w) =>
                w.id === work.id
                  ? addUpdate({ ...w, startDate: input.date }, `Obra agendada para ${input.date}.`)
                  : w,
              ),
            };
            next = notify(
              next,
              work.clientId,
              `Sua obra ${work.number} foi agendada para ${input.date} às ${input.time}.`,
            );
          }
          return audit(
            next,
            "Agendou obra",
            `Obra ${work?.number ?? input.workId}`,
            `Administrador agendou a obra ${work?.number ?? ""} para ${input.date} às ${input.time}.`,
          );
        });
        return { ok: true };
      },

      markNotificationsRead: () =>
        patch((s) => ({
          ...s,
          notifications: s.notifications.map((n) =>
            n.userId === s.currentUser?.id ? { ...n, read: true } : n,
          ),
        })),

      updatePrice: (service, basePrice, unit) =>
        patch((s) =>
          audit(
            {
              ...s,
              prices: s.prices.map((p) => (p.service === service ? { ...p, basePrice, unit } : p)),
            },
            "Alterou preço",
            `Serviço ${service}`,
            `Administrador alterou preço do serviço ${service}.`,
          ),
        ),

      clientName: (clientId) => state.users.find((u) => u.id === clientId)?.name ?? "—",
      workLabel: (workId) => {
        const work = state.works.find((w) => w.id === workId);
        return work ? `${work.number} — ${work.name}` : "—";
      },
    };
  }, [state, patch]);

  return <AppContext.Provider value={store}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppStore deve ser usado dentro de AppStoreProvider");
  return ctx;
}
