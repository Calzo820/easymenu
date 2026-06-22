export default function Card({ children, dark = false, flat = false, className = "", ...props }) {
  const classes = ["em-card", dark ? "em-card--dark" : "", flat ? "em-card--flat" : "", className].filter(Boolean).join(" ");
  return <section className={classes} {...props}>{children}</section>;
}
