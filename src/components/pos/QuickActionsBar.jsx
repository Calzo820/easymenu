export default function QuickActionsBar({
  onSend,
  onPrint,
  onSplit,
  onClear,
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <button onClick={onSend} className="pos-fast-button bg-green-600 text-white">
        Invia Cucina
      </button>

      <button onClick={onPrint} className="pos-fast-button bg-blue-600 text-white">
        Stampa Conto
      </button>

      <button onClick={onSplit} className="pos-fast-button bg-orange-500 text-white">
        Dividi Conto
      </button>

      <button onClick={onClear} className="pos-fast-button bg-red-600 text-white">
        Svuota
      </button>
    </div>
  );
}