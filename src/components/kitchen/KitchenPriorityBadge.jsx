export default function KitchenPriorityBadge({ minutes = 0 }) {
  const critical = minutes >= 20;

  return (
    <div
      className={
        "px-3 py-2 rounded-full text-sm font-bold text-white kitchen-live " +
        (critical ? "bg-red-600" : "bg-green-600")
      }
    >
      {critical ? "RITARDO" : "IN PREPARAZIONE"} · {minutes}m
    </div>
  );
}