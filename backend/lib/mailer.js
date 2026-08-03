function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendTransactionalEmail({ to, subject, textContent, htmlContent }) {
  const apiKey = String(process.env.BREVO_API_KEY || "").trim();
  const senderEmail = String(process.env.MAIL_FROM_EMAIL || "support@ordynora.com").trim();
  const senderName = String(process.env.MAIL_FROM_NAME || "Ordynora").trim();

  if (!to) return { sent: false, reason: "missing_recipient" };
  if (!apiKey) return { sent: false, reason: "mail_not_configured" };

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

function accountEmailTemplate({ eyebrow, title, message, actionLabel, actionUrl, footer }) {
  const safeUrl = escapeHtml(actionUrl);
  return `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#0f172a;line-height:1.6">
      <div style="background:#0f172a;color:#fff;padding:22px 24px;border-radius:14px 14px 0 0">
        <strong style="font-size:20px">Ordynora</strong>
        <div style="opacity:.8">${escapeHtml(eyebrow)}</div>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:0;padding:24px;border-radius:0 0 14px 14px">
        <h1 style="font-size:24px;margin:0 0 12px">${escapeHtml(title)}</h1>
        <p>${escapeHtml(message)}</p>
        <p style="margin:24px 0">
          <a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:10px">${escapeHtml(actionLabel)}</a>
        </p>
        <p style="font-size:12px;color:#64748b;word-break:break-all">Se il pulsante non funziona: ${safeUrl}</p>
        <p style="font-size:13px;color:#64748b">${escapeHtml(footer)}</p>
      </div>
    </div>`;
}

export async function sendEmailVerification({ to, name, verificationUrl }) {
  const greeting = name ? `Ciao ${name},` : "Ciao,";
  return sendTransactionalEmail({
    to,
    subject: "Verifica il tuo indirizzo email - Ordynora",
    textContent: `${greeting}\n\nConferma il tuo indirizzo email aprendo questo link entro 24 ore:\n${verificationUrl}\n\nSe non hai creato questo account, ignora il messaggio.`,
    htmlContent: accountEmailTemplate({
      eyebrow: "Sicurezza account",
      title: "Conferma la tua email",
      message: `${greeting} verifica il tuo indirizzo per completare la protezione dell'account Ordynora.`,
      actionLabel: "Verifica email",
      actionUrl: verificationUrl,
      footer: "Il link scade dopo 24 ore. Se non hai creato questo account, puoi ignorare il messaggio.",
    }),
  });
}

export async function sendPasswordReset({ to, name, resetUrl }) {
  const greeting = name ? `Ciao ${name},` : "Ciao,";
  return sendTransactionalEmail({
    to,
    subject: "Reimposta la password - Ordynora",
    textContent: `${greeting}\n\nPuoi scegliere una nuova password aprendo questo link entro 60 minuti:\n${resetUrl}\n\nSe non hai richiesto il recupero, ignora il messaggio.`,
    htmlContent: accountEmailTemplate({
      eyebrow: "Recupero account",
      title: "Scegli una nuova password",
      message: `${greeting} abbiamo ricevuto una richiesta di recupero per il tuo account Ordynora.`,
      actionLabel: "Reimposta password",
      actionUrl: resetUrl,
      footer: "Il link scade dopo 60 minuti e può essere usato una sola volta.",
    }),
  });
}

export async function sendSupportAccessNotification({
  to,
  restaurantName,
  superAdminEmail,
  supportReason,
  accessedAt = new Date(),
}) {
  const apiKey = String(process.env.BREVO_API_KEY || "").trim();
  const senderEmail = String(process.env.MAIL_FROM_EMAIL || "support@ordynora.com").trim();
  const senderName = String(process.env.MAIL_FROM_NAME || "Ordynora").trim();
  if (!to) return { sent: false, reason: "missing_recipient" };
  if (!apiKey) return { sent: false, reason: "mail_not_configured" };

  const dateLabel = new Date(accessedAt).toLocaleString("it-IT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  });
  const safeRestaurant = escapeHtml(restaurantName || "Ristorante");
  const safeReason = escapeHtml(supportReason);
  const safeAdmin = escapeHtml(superAdminEmail || "Assistenza Ordynora");
  const subject = `Accesso assistenza Ordynora - ${restaurantName || "ristorante"}`;
  const textContent = [
    `Ciao ${restaurantName || ""},`,
    "",
    `l'assistenza Ordynora ha effettuato un accesso al tuo account il ${dateLabel}.`,
    `Motivazione: ${supportReason}`,
    `Operatore: ${superAdminEmail || "Assistenza Ordynora"}`,
    "",
    "Durante l'assistenza i dati economici restano nascosti. L'accesso viene registrato nel log di sicurezza.",
    "Se non riconosci questa attività, contatta subito support@ordynora.com o il +39 324 046 7723.",
  ].join("\n");
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#0f172a;line-height:1.6">
      <div style="background:#0f172a;color:#fff;padding:22px 24px;border-radius:14px 14px 0 0">
        <strong style="font-size:20px">Ordynora</strong>
        <div style="opacity:.8">Avviso di sicurezza</div>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:0;padding:24px;border-radius:0 0 14px 14px">
        <h1 style="font-size:24px;margin:0 0 12px">Accesso assistenza registrato</h1>
        <p>L'assistenza Ordynora ha effettuato un accesso a <strong>${safeRestaurant}</strong> il ${escapeHtml(dateLabel)}.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:10px">
          <div><strong>Motivazione:</strong> ${safeReason}</div>
          <div><strong>Operatore:</strong> ${safeAdmin}</div>
        </div>
        <p>Durante l'assistenza i dati economici restano nascosti. L'accesso viene registrato nel log di sicurezza.</p>
        <p style="font-size:13px;color:#64748b">Se non riconosci questa attività, contatta support@ordynora.com o il +39 324 046 7723.</p>
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
