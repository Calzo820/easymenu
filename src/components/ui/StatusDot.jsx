export default function StatusDot({ tone = "green", label }) {
  const color = tone === "red" ? "#dc2626" : tone === "amber" ? "#d97706" : tone === "blue" ? "#2563eb" : "#16a34a";
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color, fontWeight: 900 }}><span className="em-dot" />{label}</span>;
}
