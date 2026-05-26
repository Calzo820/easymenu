export default function WelcomeChecklist() {
  const steps = [
    "Configura tavoli",
    "Importa menu",
    "Collega stampanti",
    "Attiva ordini live",
  ];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-xl border">
      <h2 className="text-2xl font-bold mb-4">Setup rapido ristorante</h2>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step}
            className="flex items-center gap-4 p-4 rounded-xl bg-gray-50"
          >
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold">
              {index + 1}
            </div>
            <span className="text-lg font-medium">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}