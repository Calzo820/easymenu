import Stripe from "stripe";
import prisma from "../lib/prisma.js";
import { syncSubscriptionFromStripe } from "./subscription.controller.js";
import { logPaymentProblem } from "../lib/logger.js";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2025-03-31.basil" });
}

function getClientUrl() {
  return String(process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
}

function centsToMoney(value) {
  const cents = Number(value || 0);
  return Number.isFinite(cents) ? cents / 100 : 0;
}

function toMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function remainingAmount(order) {
  const paid = (order.payments || [])
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + toMoney(payment.amount), 0);
  return Math.max(0, toMoney(order.totalAmount) - paid);
}

async function refreshOrderPaymentStatus(tx, orderId) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });

  if (!order) return null;

  const paid = order.payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + toMoney(payment.amount), 0);

  const total = toMoney(order.totalAmount);
  const isPaid = total > 0 && paid + 0.01 >= total;

  return tx.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: isPaid ? "paid" : paid > 0 ? "pending" : order.paymentStatus,
      paymentMethod: isPaid ? "online" : order.paymentMethod,
      paidAt: isPaid ? order.paidAt || new Date() : order.paidAt,
    },
    include: { table: true, payments: true },
  });
}

export async function getPublicPaymentSummary(req, res) {
  try {
    const { token } = req.params;
    const order = await prisma.order.findFirst({
      where: { OR: [{ publicToken: token }, { id: token }] },
      include: { payments: true, table: true, restaurant: true },
    });

    if (!order) return res.status(404).json({ message: "Ordine non trovato" });

    const paidAmount = order.payments
      .filter((payment) => payment.status === "paid")
      .reduce((sum, payment) => sum + toMoney(payment.amount), 0);

    return res.json({
      orderId: order.id,
      publicToken: order.publicToken,
      tableName: order.table?.name,
      restaurantName: order.restaurant?.name,
      totalAmount: toMoney(order.totalAmount),
      paidAmount,
      remainingAmount: Math.max(0, toMoney(order.totalAmount) - paidAmount),
      paymentStatus: order.paymentStatus,
      payments: order.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        splitLabel: payment.splitLabel,
        paidAt: payment.paidAt,
      })),
    });
  } catch (error) {
    console.error("getPublicPaymentSummary error:", error);
    return res.status(500).json({ message: "Errore durante recupero pagamenti" });
  }
}

export async function createPublicStripeCheckout(req, res) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(501).json({
        message: "Stripe non configurato. Imposta STRIPE_SECRET_KEY nel backend.",
      });
    }

    const { token } = req.params;
    const splitCount = Math.max(1, Math.min(20, Math.trunc(Number(req.body?.splitCount || 1))));
    const payerIndex = Math.max(1, Math.trunc(Number(req.body?.payerIndex || 1)));

    const order = await prisma.order.findFirst({
      where: { OR: [{ publicToken: token }, { id: token }] },
      include: { table: true, restaurant: true, items: true, payments: true },
    });

    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    if (order.status === "cancelled" || order.closedAt) {
      return res.status(400).json({ message: "Ordine non pagabile" });
    }

    const remaining = remainingAmount(order);
    if (remaining <= 0.01 || order.paymentStatus === "paid") {
      return res.status(400).json({ message: "Ordine già pagato" });
    }

    const amountToPay = Math.min(remaining, Math.ceil((remaining / splitCount) * 100) / 100);
    const amountCents = Math.max(50, Math.round(amountToPay * 100));
    const currency = String(order.restaurant?.currency || "EUR").toLowerCase();
    const clientUrl = getClientUrl();
    const successUrl = `${clientUrl}/menu/${encodeURIComponent(order.restaurant.slug)}/${encodeURIComponent(order.table.qrToken)}?payment=success&order=${encodeURIComponent(order.publicToken)}`;
    const cancelUrl = `${clientUrl}/menu/${encodeURIComponent(order.restaurant.slug)}/${encodeURIComponent(order.table.qrToken)}?payment=cancelled&order=${encodeURIComponent(order.publicToken)}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_creation: "if_required",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amountCents,
            product_data: {
              name: `Conto ${order.restaurant.name} - ${order.table.name}`,
              description: splitCount > 1 ? `Quota ${payerIndex}/${splitCount}` : `Ordine ${order.orderNumber}`,
            },
          },
        },
      ],
      metadata: {
        orderId: order.id,
        restaurantId: order.restaurantId,
        publicToken: order.publicToken,
        splitCount: String(splitCount),
        payerIndex: String(payerIndex),
      },
    });

    await prisma.paymentTransaction.create({
      data: {
        restaurantId: order.restaurantId,
        orderId: order.id,
        provider: "stripe",
        providerSessionId: session.id,
        amount: amountCents / 100,
        currency: currency.toUpperCase(),
        status: "pending",
        splitLabel: splitCount > 1 ? `Quota ${payerIndex}/${splitCount}` : "Pagamento unico",
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "pending",
        paymentMethod: "online",
        stripeCheckoutSessionId: session.id,
      },
    });

    return res.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      amount: amountCents / 100,
      currency: currency.toUpperCase(),
    });
  } catch (error) {
    console.error("createPublicStripeCheckout error:", error);
    return res.status(500).json({ message: "Errore durante creazione checkout Stripe" });
  }
}

export async function handleStripeWebhook(req, res) {
  const stripe = getStripe();
  if (!stripe) return res.status(501).json({ message: "Stripe non configurato" });

  try {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } else {
      event = JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body || "{}"));
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.mode === "subscription") {
        const synced = await syncSubscriptionFromStripe(session);
        const io = req.app.get("io");
        if (io && synced?.restaurant) {
          io.to(`restaurant:${synced.restaurant.id}`).emit("subscription-updated", {
            restaurantId: synced.restaurant.id,
            plan: synced.restaurant.plan,
            status: synced.subscription.status,
          });
        }
      }

      const orderId = session.metadata?.orderId;
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

      if (orderId) {
        const updated = await prisma.$transaction(async (tx) => {
          await tx.paymentTransaction.updateMany({
            where: { providerSessionId: session.id },
            data: {
              status: "paid",
              providerPaymentIntentId: paymentIntentId || null,
              amount: session.amount_total ? centsToMoney(session.amount_total) : undefined,
              currency: session.currency ? String(session.currency).toUpperCase() : undefined,
              paidAt: new Date(),
            },
          });

          await tx.order.update({
            where: { id: orderId },
            data: {
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId: paymentIntentId || null,
              paymentMethod: "online",
            },
          });

          return refreshOrderPaymentStatus(tx, orderId);
        });

        const io = req.app.get("io");
        if (io && updated) {
          io.to(`restaurant:${updated.restaurantId}`).emit("payment-updated", {
            orderId: updated.id,
            restaurantId: updated.restaurantId,
            tableId: updated.tableId,
            tableName: updated.table?.name,
            paymentStatus: updated.paymentStatus,
            paidAt: updated.paidAt,
          });
          io.to(`restaurant:${updated.restaurantId}`).emit("table-updated", {
            orderId: updated.id,
            restaurantId: updated.restaurantId,
            tableId: updated.tableId,
            reason: "payment-updated",
          });
        }
      }
    }


    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      if (subscriptionId) {
        const synced = await syncSubscriptionFromStripe({ object: "subscription", id: subscriptionId });
        const io = req.app.get("io");
        if (io && synced?.restaurant) {
          io.to(`restaurant:${synced.restaurant.id}`).emit("subscription-updated", {
            restaurantId: synced.restaurant.id,
            plan: synced.restaurant.plan,
            status: synced.subscription.status,
          });
        }
      }
    }

    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      const subscription = event.data.object;
      const synced = await syncSubscriptionFromStripe(subscription);
      const io = req.app.get("io");
      if (io && synced?.restaurant) {
        io.to(`restaurant:${synced.restaurant.id}`).emit("subscription-updated", {
          restaurantId: synced.restaurant.id,
          plan: synced.restaurant.plan,
          status: synced.subscription.status,
        });
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      await prisma.paymentTransaction.updateMany({
        where: { providerSessionId: session.id, status: "pending" },
        data: { status: "unpaid" },
      });
      await logPaymentProblem({
        restaurantId: session.metadata?.restaurantId || null,
        message: "Checkout Stripe scaduto",
        metadata: { sessionId: session.id, orderId: session.metadata?.orderId },
      });
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      await prisma.paymentTransaction.updateMany({
        where: { providerPaymentIntentId: paymentIntent.id, status: "pending" },
        data: { status: "unpaid" },
      });
      await logPaymentProblem({
        restaurantId: paymentIntent.metadata?.restaurantId || null,
        message: "Pagamento Stripe fallito",
        metadata: { paymentIntentId: paymentIntent.id, lastPaymentError: paymentIntent.last_payment_error },
      });
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (paymentIntentId) {
        const updatedPayments = await prisma.paymentTransaction.updateMany({
          where: { providerPaymentIntentId: paymentIntentId },
          data: { status: "refunded" },
        });
        if (updatedPayments.count > 0) {
          const payment = await prisma.paymentTransaction.findFirst({ where: { providerPaymentIntentId: paymentIntentId } });
          if (payment?.orderId) {
            const updated = await prisma.order.update({
              where: { id: payment.orderId },
              data: { paymentStatus: "refunded" },
              include: { table: true },
            });
            const io = req.app.get("io");
            if (io) io.to(`restaurant:${updated.restaurantId}`).emit("payment-updated", { orderId: updated.id, restaurantId: updated.restaurantId, tableId: updated.tableId, paymentStatus: updated.paymentStatus });
          }
        }
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("handleStripeWebhook error:", error);
    await logPaymentProblem({ message: "Webhook Stripe non valido", error, metadata: { headers: req.headers } });
    return res.status(400).json({ message: `Webhook Stripe non valido: ${error.message}` });
  }
}


function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
export async function getPublicReceipt(req, res) {
  try {
    const { token } = req.params;
    const order = await prisma.order.findFirst({
      where: { OR: [{ publicToken: token }, { id: token }] },
      include: { restaurant: true, table: true, items: true, payments: { orderBy: { createdAt: "desc" } } },
    });
    if (!order) return res.status(404).json({ message: "Ordine non trovato" });

    const paidAmount = order.payments.filter((p) => p.status === "paid").reduce((s, p) => s + toMoney(p.amount), 0);
    const subtotal = order.items.reduce((s, i) => s + toMoney(i.priceSnapshot) * toMoney(i.quantity), 0);
    const vatRate = 10;
    const taxable = subtotal / (1 + vatRate / 100);
    const vat = subtotal - taxable;

    const receipt = {
      receiptNumber: `R-${String(order.orderNumber || 1).padStart(5, "0")}`,
      issuedAt: new Date().toISOString(),
      restaurant: { name: order.restaurant?.name, slug: order.restaurant?.slug, currency: order.restaurant?.currency || "EUR" },
      table: order.table ? { name: order.table.name, code: order.table.code } : null,
      order: { id: order.id, publicToken: order.publicToken, orderNumber: order.orderNumber, status: order.status, paymentStatus: order.paymentStatus, paymentMethod: order.paymentMethod, paidAt: order.paidAt, totalAmount: toMoney(order.totalAmount), discountAmount: toMoney(order.discountAmount), extraAmount: toMoney(order.extraAmount) },
      items: order.items.map((i) => ({ name: i.nameSnapshot, quantity: i.quantity, unitPrice: toMoney(i.priceSnapshot), total: toMoney(i.priceSnapshot) * toMoney(i.quantity), category: i.categorySnapshot, notes: i.notes })),
      totals: { subtotal, discount: toMoney(order.discountAmount), extra: toMoney(order.extraAmount), grandTotal: toMoney(order.totalAmount), paidAmount, remainingAmount: Math.max(0, toMoney(order.totalAmount) - paidAmount), vat: [{ rate: vatRate, net: Number(taxable.toFixed(2)), vat: Number(vat.toFixed(2)), gross: Number(subtotal.toFixed(2)) }] },
      payments: order.payments.map((p) => ({ id: p.id, provider: p.provider, amount: p.amount, currency: p.currency, status: p.status, splitLabel: p.splitLabel, paidAt: p.paidAt })),
      note: "Ricevuta non fiscale di cortesia. Per fattura elettronica integrare i dati fiscali del cliente.",
    };

    const wantsJson = String(req.headers.accept || "").includes("application/json") || req.query.format === "json";
    if (wantsJson) return res.json(receipt);

    const rows = receipt.items.map((item) => {
      const details = [item.category, item.notes].filter(Boolean).map(escapeHtml).join(" · ");
      return `
      <tr><td><b>${escapeHtml(item.name)}</b><small>${details}</small></td><td>${Number(item.quantity)}</td><td>€ ${item.unitPrice.toFixed(2)}</td><td>€ ${item.total.toFixed(2)}</td></tr>
    `;
    }).join("");
    const payments = receipt.payments.length
      ? receipt.payments.map((payment) => `<li>${escapeHtml(payment.splitLabel || "Pagamento")}: € ${toMoney(payment.amount).toFixed(2)} · ${escapeHtml(payment.status)}</li>`).join("")
      : "<li>Nessun pagamento registrato</li>";
    const restaurantName = escapeHtml(receipt.restaurant.name || "Ristorante");
    const tableName = escapeHtml(receipt.table?.name || "-");
    const receiptNumber = escapeHtml(receipt.receiptNumber);
    const issuedAt = escapeHtml(new Date(receipt.issuedAt).toLocaleString("it-IT"));
    const receiptNote = escapeHtml(receipt.note);

    return res.type("html").send(`<!doctype html>
<html lang="it"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Ricevuta ${receiptNumber}</title>
<style>body{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;margin:0;background:#f1f5f9;color:#0f172a}.wrap{max-width:760px;margin:24px auto;padding:20px}.card{background:white;border:1px solid #e2e8f0;border-radius:26px;box-shadow:0 20px 60px rgba(15,23,42,.08);padding:26px}.top{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.badge{background:#ecfdf5;color:#166534;border:1px solid #bbf7d0;padding:8px 12px;border-radius:999px;font-weight:900}.muted{color:#64748b}h1{margin:6px 0 0;font-size:30px}table{width:100%;border-collapse:collapse;margin-top:22px}td,th{padding:12px;border-bottom:1px solid #e2e8f0;text-align:right}td:first-child,th:first-child{text-align:left}small{display:block;color:#64748b;margin-top:4px}.total{margin-top:20px;background:#0f172a;color:white;border-radius:20px;padding:18px;display:grid;gap:8px}.line{display:flex;justify-content:space-between}.grand{font-size:24px;font-weight:900}.print{margin-top:18px;border:0;border-radius:14px;padding:12px 16px;background:#2563eb;color:white;font-weight:900;cursor:pointer}@media print{body{background:white}.wrap{margin:0;max-width:none}.card{box-shadow:none;border:0}.print{display:none}}</style></head>
<body><div class="wrap"><div class="card"><div class="top"><div><div class="muted">${restaurantName}</div><h1>Ricevuta / preconto</h1><div class="muted">${receiptNumber} · ${issuedAt}</div></div><div class="badge">${receipt.order.paymentStatus === "paid" ? "Pagato" : "Da pagare"}</div></div>
<p><b>Tavolo:</b> ${tableName}</p><table><thead><tr><th>Prodotto</th><th>Qtà</th><th>Prezzo</th><th>Totale</th></tr></thead><tbody>${rows}</tbody></table>
<div class="total"><div class="line"><span>Subtotale</span><b>€ ${receipt.totals.subtotal.toFixed(2)}</b></div><div class="line"><span>IVA indicativa 10%</span><b>€ ${receipt.totals.vat[0].vat.toFixed(2)}</b></div><div class="line grand"><span>Totale</span><span>€ ${receipt.totals.grandTotal.toFixed(2)}</span></div><div class="line"><span>Pagato</span><b>€ ${receipt.totals.paidAmount.toFixed(2)}</b></div><div class="line"><span>Residuo</span><b>€ ${receipt.totals.remainingAmount.toFixed(2)}</b></div></div>
<h3>Pagamenti</h3><ul>${payments}</ul><p class="muted">${receiptNote}</p><button class="print" onclick="window.print()">Stampa / salva PDF</button></div></div></body></html>`);
  } catch (error) {
    console.error("getPublicReceipt error:", error);
    return res.status(500).json({ message: "Errore durante generazione ricevuta" });
  }
}
