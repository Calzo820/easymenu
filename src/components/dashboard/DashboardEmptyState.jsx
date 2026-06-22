export default function DashboardEmptyState({ title = "Tutto pulito", text = "Non ci sono elementi da mostrare." }) {
  return (
    <div className="dash-empty-state">
      <div className="dash-empty-icon">✓</div>
      <div>
        <b>{title}</b>
        <p>{text}</p>
      </div>
    </div>
  );
}
