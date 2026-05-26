function areaMatches(item, area) {
  const raw = String(item?.preparationArea || item?.menuItem?.preparationArea || "kitchen").toLowerCase();
  return area === "bar" ? raw === "bar" : raw !== "bar";
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

export function buildTicketHtml(order, area = "kitchen") {
  const items = (order?.items || []).filter((item) => areaMatches(item, area));
  const title = area === "bar" ? "BAR" : "CUCINA";
  const table = order?.table?.name || order?.table?.code || order?.tavolo || "Tavolo";
  const number = order?.orderNumber ? `#${String(order.orderNumber).padStart(4, "0")}` : order?.id?.slice(-5) || "";
  const created = order?.createdAt ? new Date(order.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "";

  return `<!doctype html><html><head><meta charset="utf-8" />
  <title>Ticket ${title}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    body { font-family: Arial, sans-serif; color: #000; margin: 0; font-size: 13px; }
    .top { text-align:center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
    h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: 1px; }
    .table { font-size: 26px; font-weight: 900; }
    .meta { display:flex; justify-content:space-between; font-weight:700; margin: 8px 0; }
    .item { border-top: 1px dashed #000; padding: 8px 0; }
    .qty { font-size: 22px; font-weight: 900; display:inline-block; width: 38px; }
    .name { font-size: 17px; font-weight: 900; }
    .notes { margin-left: 42px; font-size: 13px; font-weight: 700; }
    .order-notes { border: 2px solid #000; padding: 6px; margin-top: 10px; font-weight: 900; }
  </style></head><body>
    <div class="top"><h1>${title}</h1><div class="table">${esc(table)}</div></div>
    <div class="meta"><span>${esc(number)}</span><span>${esc(created)}</span></div>
    ${items.map((item) => `<div class="item"><span class="qty">${esc(item.quantity || item.qty || 1)}x</span><span class="name">${esc(item.nameSnapshot || item.nome || item.menuItem?.name || "Articolo")}</span>${item.notes ? `<div class="notes">${esc(item.notes)}</div>` : ""}</div>`).join("")}
    ${order?.notes ? `<div class="order-notes">NOTE: ${esc(order.notes)}</div>` : ""}
  </body></html>`;
}

export function printTicket(order, area = "kitchen") {
  const html = buildTicketHtml(order, area);
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  };
}
