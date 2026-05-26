function toneStyle(tone) {
  if (tone === "dark") return { background: "linear-gradient(135deg,#0f172a,#1d4ed8)", color: "white", borderColor: "rgba(255,255,255,.12)" };
  if (tone === "green") return { background: "linear-gradient(135deg,#ecfdf5,#ffffff)", borderColor: "#bbf7d0" };
  if (tone === "amber") return { background: "linear-gradient(135deg,#fffbeb,#ffffff)", borderColor: "#fde68a" };
  if (tone === "blue") return { background: "linear-gradient(135deg,#eff6ff,#ffffff)", borderColor: "#bfdbfe" };
  return { background: "white", borderColor: "#e2e8f0" };
}

export default function GrowthCard({ title, value, note, tone, children }) {
  const dark = tone === "dark";
  return (
    <div style={{
      border: "1px solid",
      borderRadius: 24,
      padding: 20,
      boxShadow: "0 18px 45px rgba(15,23,42,.08)",
      ...toneStyle(tone),
    }}>
      <div style={{ fontSize: 13, fontWeight: 950, letterSpacing: ".04em", textTransform: "uppercase", color: dark ? "rgba(255,255,255,.72)" : "#64748b" }}>{title}</div>
      {value !== undefined ? <div style={{ fontSize: 34, fontWeight: 1000, letterSpacing: "-.05em", marginTop: 8 }}>{value}</div> : null}
      {note ? <div style={{ marginTop: 8, color: dark ? "rgba(255,255,255,.78)" : "#64748b", fontWeight: 750, lineHeight: 1.5 }}>{note}</div> : null}
      {children ? <div style={{ marginTop: 14 }}>{children}</div> : null}
    </div>
  );
}
