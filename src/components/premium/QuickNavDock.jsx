import { Link } from "react-router-dom";

const items = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Cassa", to: "/cassa" },
  { label: "Cucina", to: "/cucina" },
  { label: "Bar", to: "/bar" },
  { label: "Tavoli", to: "/tavoli" },
  { label: "Statistiche", to: "/statistiche" },
];

export default function QuickNavDock() {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-card rounded-2xl px-4 py-3 shadow-2xl flex gap-3">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="px-4 py-2 rounded-xl bg-black text-white font-semibold"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}