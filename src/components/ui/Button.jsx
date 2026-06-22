export default function Button({ children, variant = "primary", full = false, className = "", ...props }) {
  const classes = ["em-btn", `em-btn--${variant}`, full ? "em-btn--full" : "", className].filter(Boolean).join(" ");
  return <button className={classes} {...props}>{children}</button>;
}
