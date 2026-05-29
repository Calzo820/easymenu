import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  apiPost,
  getAuthToken,
  setAuthToken,
} from "../lib/api";

function getDashboardPathByRole(role) {
  const normalized = String(role || "").toLowerCase();

  if (normalized === "superadmin") return "/super-admin";
  if (normalized === "owner" || normalized === "admin") return "/dashboard";
  if (normalized === "kitchen") return "/cucina";
  if (normalized === "bar") return "/bar";
  if (normalized === "cashier") return "/cassa";

  return "/dashboard";
}


const DEMO_USERS = [
  { label: "Owner", email: "owner@demo.test", password: "EasyMenu2026!", hint: "Dashboard completa" },
  { label: "Admin", email: "admin@demo.test", password: "EasyMenu2026!", hint: "Gestione operativa" },
  { label: "Cucina", email: "cucina@demo.test", password: "EasyMenu2026!", hint: "Solo cucina" },
  { label: "Bar", email: "bar@demo.test", password: "EasyMenu2026!", hint: "Solo bar" },
  { label: "Cassa", email: "cassa@demo.test", password: "EasyMenu2026!", hint: "Solo cassa" },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errore, setErrore] = useState("");
  const [successo, setSuccesso] = useState("");
  const [loading, setLoading] = useState(false);

  const emailValida = useMemo(() => {
    return /\S+@\S+\.\S+/.test(form.email.trim());
  }, [form.email]);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      // Non faccio redirect automatico forte qui,
      // così non ti incasino durante lo sviluppo.
      // Se vuoi, dopo possiamo validarlo con /auth/me.
    }
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errore) setErrore("");
    if (successo) setSuccesso("");
  }

  function useDemoUser(demoUser) {
    setForm({
      email: demoUser.email,
      password: demoUser.password,
    });
    setErrore("");
    setSuccesso(`Credenziali ${demoUser.label} inserite. Ora clicca Accedi.`);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setErrore("");
    setSuccesso("");

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      setErrore("Inserisci email e password.");
      return;
    }

    if (!emailValida) {
      setErrore("Inserisci un'email valida.");
      return;
    }

    if (password.length < 6) {
      setErrore("La password deve avere almeno 6 caratteri.");
      return;
    }

    try {
      setLoading(true);

      const data = await apiPost("/auth/login", {
        email,
        password,
      });

      if (!data?.token) {
        throw new Error("Token non ricevuto dal server.");
      }

      setAuthToken(data.token);

      if (data.user) {
        localStorage.setItem("auth_user", JSON.stringify(data.user));
      }

      if (data.restaurant) {
        localStorage.setItem("auth_restaurant", JSON.stringify(data.restaurant));
        localStorage.setItem("ristorante_attivo", data.restaurant.name || "");
        localStorage.setItem("restaurant_slug", data.restaurant.slug || "");
        localStorage.setItem("restaurant_id", data.restaurant.id || "");
      }

      setSuccesso("Login effettuato con successo.");

      const params = new URLSearchParams(location.search);
      const next = params.get("next");
      const plan = params.get("plan");
      const role = data?.user?.role || "owner";
      const redirectPath = next ? `${next}${plan ? `?plan=${encodeURIComponent(plan)}` : ""}` : getDashboardPathByRole(role);

      setTimeout(() => {
        navigate(redirectPath);
      }, 500);
    } catch (error) {
      setErrore(error.message || "Errore durante il login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #eef6ff 0%, #eaf4ff 35%, #f7fbff 100%)",
      }}
    >
      <Navbar />

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "28px 16px 40px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 22,
            alignItems: "stretch",
          }}
        >
          <div
            className="glass-hero"
            style={{
              padding: 28,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.15)",
                color: "white",
                fontWeight: 800,
                marginBottom: 18,
              }}
            >
              Accesso staff
            </div>

            <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.08 }}>
              Entra nel tuo ristorante
            </h1>

            <p
              style={{
                marginTop: 14,
                maxWidth: 640,
                opacity: 0.95,
                lineHeight: 1.7,
                fontSize: 16,
              }}
            >
              Accedi alla dashboard, alla cucina, al bar o alla cassa con il tuo account.
              Il login salva il token automaticamente e collega il frontend al backend reale.
            </p>

            <div
              style={{
                marginTop: 22,
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.14)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 22 }}>QR</div>
                <div style={{ marginTop: 6, opacity: 0.92 }}>Ordini dal tavolo</div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.14)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 22 }}>Kitchen</div>
                <div style={{ marginTop: 6, opacity: 0.92 }}>Stati ordine live</div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.14)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 22 }}>SaaS</div>
                <div style={{ marginTop: 6, opacity: 0.92 }}>Backend e DB reali</div>
              </div>
            </div>
          </div>

          <div
            className="section-card"
            style={{
              background: "rgba(255,255,255,0.96)",
              padding: 24,
              borderRadius: 28,
            }}
          >
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  color: "#64748b",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                }}
              >
                LOGIN
              </div>
              <h2 style={{ margin: "8px 0 0 0", color: "#0b2e59" }}>Bentornato</h2>
            </div>

            {errore ? (
              <div
                style={{
                  marginBottom: 14,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  borderRadius: 14,
                  padding: 12,
                  fontWeight: 700,
                }}
              >
                {errore}
              </div>
            ) : null}

            {successo ? (
              <div
                style={{
                  marginBottom: 14,
                  background: "#ecfdf5",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  borderRadius: 14,
                  padding: 12,
                  fontWeight: 700,
                }}
              >
                {successo}
              </div>
            ) : null}

            <div
              style={{
                marginBottom: 18,
                background: "#f8fbff",
                border: "1px solid #dbeafe",
                borderRadius: 18,
                padding: 14,
              }}
            >
              <div style={{ fontWeight: 900, color: "#0b2e59", marginBottom: 10 }}>
                Account demo rapidi
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {DEMO_USERS.map((demoUser) => (
                  <button
                    key={demoUser.email}
                    type="button"
                    onClick={() => useDemoUser(demoUser)}
                    style={{
                      border: "1px solid #bfdbfe",
                      background: "white",
                      borderRadius: 14,
                      padding: "10px 12px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontWeight: 900, color: "#1d4ed8" }}>
                      {demoUser.label}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                      {demoUser.hint}
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                Password demo: <strong>EasyMenu2026!</strong>. Prima esegui nel backend: <strong>npm run demo:seed</strong>.
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 800,
                    color: "#123b6b",
                  }}
                >
                  Email
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="esempio@ristorante.it"
                  autoComplete="email"
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    border: "1px solid #d6e4f5",
                    padding: "13px 14px",
                    background: "white",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 800,
                    color: "#123b6b",
                  }}
                >
                  Password
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="Inserisci la password"
                    autoComplete="current-password"
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      border: "1px solid #d6e4f5",
                      padding: "13px 14px",
                      background: "white",
                      outline: "none",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    style={{
                      border: "1px solid #d6e4f5",
                      borderRadius: 14,
                      padding: "13px 14px",
                      background: "white",
                      fontWeight: 800,
                      color: "#123b6b",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {showPassword ? "Nascondi" : "Mostra"}
                  </button>
                </div>
              </div>

              <div
                style={{
                  marginBottom: 18,
                  fontSize: 13,
                  color: "#64748b",
                  lineHeight: 1.5,
                }}
              >
                Il login salva automaticamente:
                <br />
                `auth_token`, `auth_user`, `auth_restaurant`, `ristorante_attivo`
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 16,
                  padding: "14px 18px",
                  background: "linear-gradient(135deg, #123b6b 0%, #2563eb 100%)",
                  color: "white",
                  fontWeight: 900,
                  fontSize: 16,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  boxShadow: "0 16px 26px rgba(37,99,235,0.20)",
                }}
              >
                {loading ? "Accesso in corso..." : "Accedi"}
              </button>
            </form>

            <div
              style={{
                marginTop: 18,
                paddingTop: 18,
                borderTop: "1px solid #e5edf8",
                color: "#64748b",
                fontSize: 14,
              }}
            >
              Non hai ancora un account?{" "}
              <Link
                to="/register"
                style={{
                  color: "#2563eb",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                Registrati
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}