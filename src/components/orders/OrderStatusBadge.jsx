const LABELS = {
  pending: "In attesa",
  in_progress: "In preparazione",
  ready: "Pronto",
  served: "Servito",
  cancelled: "Annullato",
};

export default function OrderStatusBadge({ status }) {
  return <span className={`order-status order-status--${status || "unknown"}`}>{LABELS[status] || status || "Sconosciuto"}</span>;
}
