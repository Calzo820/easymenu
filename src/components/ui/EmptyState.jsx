export default function EmptyState({ title = "Nessun dato", text = "Qui compariranno le informazioni appena disponibili.", action }) {
  return (
    <div className="em-empty">
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
        {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
      </div>
    </div>
  );
}
