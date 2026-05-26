function StatPill({ label, value, tone = "blue" }) {
  const tones = {
    blue: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    green: { bg: "#ecfdf5", color: "#047857", border: "#bbf7d0" },
    amber: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
    red: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
    dark: { bg: "#111827", color: "white", border: "#111827" },
  };
  const theme = tones[tone] || tones.blue;

  return (
    <div
      className="em-lift"
      style={{
        border: `1px solid ${theme.border}`,
        background: theme.bg,
        color: theme.color,
        borderRadius: 18,
        padding: "12px 14px",
        minHeight: 70,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.4, opacity: 0.75 }}>
        {label}
      </div>
      <div style={{ marginTop: 4, fontSize: 24, fontWeight: 950, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

export default function OperationalFlowStrip({ title, subtitle, stats = [], actions = [] }) {
  return (
    <div className="em-flow-strip section-card" style={{ marginBottom: 16 }}>
      <div className="em-flow-head">
        <div>
          <div style={{ fontWeight: 950, fontSize: 20, color: "#0f172a" }}>{title}</div>
          {subtitle ? <div style={{ marginTop: 4, color: "#64748b", fontWeight: 700 }}>{subtitle}</div> : null}
        </div>

        {actions.length > 0 ? (
          <div className="em-flow-actions">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className="em-action-button"
                style={{
                  background: action.primary
                    ? "linear-gradient(135deg, #111827 0%, #1f2937 100%)"
                    : "white",
                  color: action.primary ? "white" : "#111827",
                  border: action.primary ? "none" : "1px solid #e5e7eb",
                  opacity: action.disabled ? 0.6 : 1,
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="em-flow-stats">
        {stats.map((stat) => (
          <StatPill key={stat.label} {...stat} />
        ))}
      </div>
    </div>
  );
}
