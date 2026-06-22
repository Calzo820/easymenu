export default function DashboardStat({ label, value, detail, tone = "neutral" }) {
  return (
    <section className={`dash-stat dash-stat--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </section>
  );
}
