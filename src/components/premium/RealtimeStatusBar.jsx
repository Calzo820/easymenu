export default function RealtimeStatusBar() {
  return (
    <div className="w-full rounded-2xl p-4 text-white live-gradient shadow-2xl">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <div className="text-sm opacity-70">Ordini live</div>
          <div className="text-3xl font-bold">24</div>
        </div>

        <div>
          <div className="text-sm opacity-70">Tempo cucina</div>
          <div className="text-3xl font-bold">12m</div>
        </div>

        <div>
          <div className="text-sm opacity-70">Ticket medio</div>
          <div className="text-3xl font-bold">€34</div>
        </div>
      </div>
    </div>
  );
}