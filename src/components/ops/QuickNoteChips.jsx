const DEFAULT_NOTES = ["Senza sale", "No piccante", "Allergia", "Bimbo", "Urgente", "Portare insieme"];

export default function QuickNoteChips({ value = "", onChange, notes = DEFAULT_NOTES }) {
  function addNote(note) {
    const clean = String(value || "").trim();
    const next = clean ? `${clean}; ${note}` : note;
    onChange?.(next);
  }

  return (
    <div className="em-note-chips">
      <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Note rapide</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {notes.map((note) => (
          <button
            key={note}
            type="button"
            className="em-chip-button"
            onClick={() => addNote(note)}
          >
            {note}
          </button>
        ))}
      </div>
    </div>
  );
}
