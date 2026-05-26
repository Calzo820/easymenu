export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function euro(value) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(num(value));
}

export function oneDecimal(value) {
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(num(value));
}

export function pct(value) {
  return `${oneDecimal(value)}%`;
}
