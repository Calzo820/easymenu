import Card from "./Card.jsx";

export default function KpiTile({ label, value, note, tone = "default" }) {
  return (
    <Card className={`em-kpi em-kpi--${tone}`}>
      <div>
        <div className="em-kpi__label">{label}</div>
        <div className="em-kpi__value">{value}</div>
      </div>
      {note ? <div className="em-kpi__note">{note}</div> : null}
    </Card>
  );
}
