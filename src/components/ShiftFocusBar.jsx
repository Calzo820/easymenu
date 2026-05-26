export default function ShiftFocusBar({ items = [] }) {
  const safeItems = items.length ? items : [
    { label: "Ordini live", value: "0" },
    { label: "Ritardi", value: "0" },
    { label: "Da chiudere", value: "0" },
  ];

  return (
    <div className="em-shift-bar">
      {safeItems.map((item) => (
        <div className="em-shift-card" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.hint ? <small>{item.hint}</small> : null}
        </div>
      ))}
    </div>
  );
}
