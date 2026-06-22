export default function Field({ label, children, className = "" }) {
  return (
    <div className={["em-field", className].filter(Boolean).join(" ")}>
      {label ? <label>{label}</label> : null}
      {children}
    </div>
  );
}
