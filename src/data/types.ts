export type Role = "cliente" | "admin";

export type ServiceType =
  | "Pintura"
  | "Reforma de banheiro"
  | "Reforma de cozinha"
  | "Instalação elétrica"
  | "Instalação hidráulica"
  | "Construção"
  | "Outros";

export const SERVICE_TYPES: ServiceType[] = [
  "Pintura",
  "Reforma de banheiro",
  "Reforma de cozinha",
  "Instalação elétrica",
  "Instalação hidráulica",
  "Construção",
  "Outros",
];

export type QuoteStatus =
  | "Aguardando análise"
  | "Em análise"
  | "Aprovado"
  | "Recusado"
  | "Expirado";

export type WorkStatus = "Agendada" | "Em andamento" | "Concluída";

export type PaymentStatus = "Pendente" | "Aprovado" | "Recusado" | "Estornado";

export type PaymentMethod = "PIX" | "Cartão de crédito" | "Cartão de débito";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string | undefined;
  cpf?: string | undefined;
  address?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  createdAt: string;
  active: boolean;
}

export interface FileRef {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  kind: "foto" | "documento";
}

export interface Quote {
  id: string;
  number: string;
  clientId: string;
  service: ServiceType;
  description: string;
  address: string;
  desiredDate: string;
  notes?: string | undefined;
  value: number | null;
  status: QuoteStatus;
  createdAt: string;
  files: FileRef[];
  clientApproved?: boolean | undefined;
  refusalReason?: string | undefined;
}

export interface WorkUpdate {
  id: string;
  date: string;
  text: string;
}

export interface Review {
  rating: number;
  comment: string;
  date: string;
}

export interface Work {
  id: string;
  number: string;
  name: string;
  clientId: string;
  quoteId?: string | undefined;
  service: ServiceType;
  address: string;
  total: number;
  startDate: string;
  endDate: string;
  responsible: string;
  status: WorkStatus;
  progress: number;
  updates: WorkUpdate[];
  files: FileRef[];
  review?: Review | undefined;
}

export interface Payment {
  id: string;
  clientId: string;
  workId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  status: PaymentStatus;
  installments?: number | undefined;
}

export interface Schedule {
  id: string;
  workId: string;
  clientId: string;
  date: string;
  time: string;
  address: string;
  status: "Confirmado" | "Pendente" | "Realizado";
  team: string;
}

export interface Notification {
  id: string;
  userId: string;
  text: string;
  date: string;
  read: boolean;
  tone: "info" | "success" | "warning";
}

export interface AuditLog {
  id: string;
  date: string;
  user: string;
  action: string;
  entity: string;
  description: string;
}

export interface ServicePrice {
  service: ServiceType;
  basePrice: number;
  unit: string;
}
