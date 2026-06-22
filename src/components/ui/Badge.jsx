export default function Badge({ children, tone = "default", dot = false, className = "" }) {
  const classes = ["em-badge", tone !== "default" ? `em-badge--${tone}` : "", className].filter(Boolean).join(" ");
  return <span className={classes}>{dot ? <span className="em-dot" /> : null}{children}</span>;
}
