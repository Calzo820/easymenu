export default function Page({ eyebrow, title, subtitle, actions, children, tight = false }) {
  return (
    <main className={`em-page ${tight ? "em-page--tight" : ""}`}>
      {(title || subtitle || actions) ? (
        <header className="em-page-header">
          <div>
            {eyebrow ? <div className="em-eyebrow">{eyebrow}</div> : null}
            {title ? <h1 className="em-title">{title}</h1> : null}
            {subtitle ? <p className="em-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="em-toolbar__actions">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </main>
  );
}
