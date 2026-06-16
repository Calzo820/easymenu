function MiniMetric({ label, value, tone = "default" }) {
  return (
    <div className={`operator-mini-metric operator-mini-metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function OperatorCommandCenter({
  area,
  statusColor = "#22c55e",
  title,
  subtitle,
  metrics = [],
  primaryActions = [],
  viewControls = null,
  filters = null,
  liveMessage = null,
}) {
  return (
    <section className="operator-command-center">
      <div className="operator-command-main">
        <div className="operator-title-row">
          <div className="operator-live-pill">
            <span className="status-dot" style={{ background: statusColor }} />
            {area}
          </div>
          {liveMessage ? <div className="operator-live-message">{liveMessage}</div> : null}
        </div>

        <div className="operator-heading-row">
          <div>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="operator-action-row">
            {primaryActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={action.primary ? "operator-action-primary" : "operator-action-secondary"}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="operator-command-side">
        <div className="operator-metrics-grid">
          {metrics.map((metric) => (
            <MiniMetric key={metric.label} {...metric} />
          ))}
        </div>

        {(viewControls || filters) ? (
          <div className="operator-control-panel">
            {viewControls ? <div className="operator-control-group">{viewControls}</div> : null}
            {filters ? <div className="operator-control-group">{filters}</div> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
