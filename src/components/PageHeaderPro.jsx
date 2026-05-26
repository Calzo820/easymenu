export default function PageHeaderPro({ eyebrow, title, subtitle, right, children }) {
  return (
    <section className="em-page-hero">
      <div>
        {eyebrow ? <div className="em-eyebrow">{eyebrow}</div> : null}
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
        {children ? <div className="em-hero-children">{children}</div> : null}
      </div>
      {right ? <div className="em-page-hero-side">{right}</div> : null}
    </section>
  );
}
