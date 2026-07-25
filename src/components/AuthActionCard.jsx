import { Link } from "react-router-dom";
import "../styles/auth.css";

export default function AuthActionCard({ eyebrow, title, description, children }) {
  return (
    <main className="auth-action-page">
      <section className="auth-action-card">
        <Link to="/" className="auth-action-brand">EasyMenu</Link>
        <span className="auth-action-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
        <Link to="/login" className="auth-action-back">Torna all'accesso</Link>
      </section>
    </main>
  );
}
