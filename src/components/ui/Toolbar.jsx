export default function Toolbar({ title, subtitle, actions, children }) {
  return (
    <div className="em-toolbar">
      <div>
        {title ? <div className="panel-title">{title}</div> : null}
        {subtitle ? <div className="panel-subtitle">{subtitle}</div> : null}
        {children}
      </div>
      {actions ? <div className="em-toolbar__actions">{actions}</div> : null}
    </div>
  );
}
