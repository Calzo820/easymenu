export default function SmartActionButton({ children, busy, danger, success, className = "", ...props }) {
  const tone = danger ? "danger" : success ? "success" : "primary";
  return (
    <button {...props} disabled={busy || props.disabled} className={`smart-action ${tone} ${className}`}>
      {busy ? <span className="smart-spinner" aria-hidden="true" /> : null}
      <span>{busy ? "Operazione..." : children}</span>
    </button>
  );
}
