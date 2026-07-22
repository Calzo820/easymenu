function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendSupportAccessNotification({
  to,
  restaurantName,
  superAdminEmail,
  supportReason,
  accessedAt = new Date(),
}) {
  const apiKey = String(process.env.BREVO_API_KEY || "").trim();
  const senderEmail = String(process.env.MAIL_FROM_EMAIL || "easy.menu.service@gmail.com").trim();
  const senderName = String(process.env.MAIL_FROM_NAME || "EasyMenu").trim();
  if (!to) return { sent: false, reason: "missing_recipient" };
  if (!apiKey) return { sent: false, reason: "mail_not_configured" };

  const dateLabel = new Date(accessedAt).toLocaleString("it-IT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  });
  const safeRestaurant = escapeHtml(restaurantName || "Ristorante");
  const safeReason = escapeHtml(supportReason);
  const safeAdmin = escapeHtml(superAdminEmail || "Assistenza EasyMenu");
  const subject = `Accesso assistenza EasyMenu - ${restaurantName || "ristorante"}`;
  const textContent = [
    `Ciao ${restaurantName || ""},`,
    "",
    `l'assistenza EasyMenu ha effettuato un accesso al tuo account il ${dateLabel}.`,
    `Motivazione: ${supportReason}`,
    `Operatore: ${superAdminEmail || "Assistenza EasyMenu"}`,
    "",
    "Durante l'assistenza i dati economici restano nascosti. L'accesso viene registrato nel log di sicurezza.",
    "Se non riconosci questa attività, contatta subito easy.menu.service@gmail.com o il +39 324 046 7723.",
  ].join("\n");
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#0f172a;line-height:1.6">
      <div style="background:#0f172a;color:#fff;padding:22px 24px;border-radius:14px 14px 0 0">
        <strong style="font-size:20px">EasyMenu</strong>
        <div style="opacity:.8">Avviso di sicurezza</div>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:0;padding:24px;border-radius:0 0 14px 14px">
        <h1 style="font-size:24px;margin:0 0 12px">Accesso assistenza registrato</h1>
        <p>L'assistenza EasyMenu ha effettuato un accesso a <strong>${safeRestaurant}</strong> il ${escapeHtml(dateLabel)}.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:10px">
          <div><strong>Motivazione:</strong> ${safeReason}</div>
          <div><strong>Operatore:</strong> ${safeAdmin}</div>
        </div>
        <p>Durante l'assistenza i dati economici restano nascosti. L'accesso viene registrato nel log di sicurezza.</p>
        <p style="font-size:13px;color:#64748b">Se non riconosci questa attività, contatta easy.menu.service@gmail.com o il +39 324 046 7723.</p>
      </div>
    </div>`;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      textContent,
      htmlContent,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.message || `Invio email non riuscito (${response.status})`);
  return { sent: true, messageId: result.messageId || null };
}
