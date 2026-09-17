export const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatDate = (iso: string) => {
  if (!iso) return "—";
  const [datePart] = iso.split("T");
  const [y, m, d] = datePart.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

export const formatDateTime = (iso: string) => {
  if (!iso) return "—";
  const [datePart, timePart = ""] = iso.split("T");
  return `${formatDate(datePart)} ${timePart.slice(0, 5)}`.trim();
};

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export const onlyDigits = (v: string) => v.replace(/\D/g, "");

export const maskCPF = (v: string) =>
  onlyDigits(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export const maskPhone = (v: string) =>
  onlyDigits(v)
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");

export const maskCard = (v: string) =>
  onlyDigits(v)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();

export const monthLabel = (iso: string) => {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const m = Number(iso.slice(5, 7));
  return months[m - 1] ?? "";
};
