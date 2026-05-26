const DEFAULT_TRIAL_DAYS = 14;

export const BILLING_ALLOWED_STATUSES = new Set(["trialing", "active"]);
export const BILLING_BLOCKED_STATUSES = new Set(["past_due", "canceled", "unpaid", "incomplete"]);

export function getTrialDays() {
  const days = Number(process.env.SAAS_TRIAL_DAYS || process.env.STRIPE_TRIAL_DAYS || DEFAULT_TRIAL_DAYS);
  if (!Number.isFinite(days) || days < 0) return DEFAULT_TRIAL_DAYS;
  return Math.min(90, Math.trunc(days));
}

export function trialEndDate(from = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() + getTrialDays());
  return date;
}

export function daysUntil(dateValue) {
  if (!dateValue) return null;
  const target = new Date(dateValue).getTime();
  if (!Number.isFinite(target)) return null;
  return Math.ceil((target - Date.now()) / 86400000);
}

export function resolveBillingState(subscription, restaurant = null) {
  if (!restaurant?.isActive) {
    return { allowed: false, reason: "restaurant_inactive", status: "inactive", plan: restaurant?.plan || "starter", daysRemaining: null, effectiveUntil: null };
  }

  if (!subscription) {
    return { allowed: false, reason: "missing_subscription", status: "incomplete", plan: restaurant?.plan || "starter", daysRemaining: null, effectiveUntil: null };
  }

  const status = subscription.status || "incomplete";
  const effectiveUntil = subscription.currentPeriodEnd || subscription.trialEndsAt || null;
  const daysRemaining = daysUntil(effectiveUntil);
  const periodExpired = effectiveUntil ? new Date(effectiveUntil).getTime() < Date.now() : false;

  if (status === "trialing") {
    return {
      allowed: !periodExpired,
      reason: periodExpired ? "trial_expired" : "trial_active",
      status,
      plan: subscription.plan || restaurant?.plan || "starter",
      daysRemaining,
      effectiveUntil,
    };
  }

  if (status === "active") {
    return {
      allowed: !periodExpired,
      reason: periodExpired ? "subscription_expired" : "subscription_active",
      status,
      plan: subscription.plan || restaurant?.plan || "starter",
      daysRemaining,
      effectiveUntil,
    };
  }

  return {
    allowed: false,
    reason: status === "past_due" ? "payment_required" : `subscription_${status}`,
    status,
    plan: subscription.plan || restaurant?.plan || "starter",
    daysRemaining,
    effectiveUntil,
  };
}

export function billingBlockPayload(state) {
  return {
    message: "Account scaduto o pagamento richiesto. Vai in Billing per riattivare il ristorante.",
    code: "BILLING_REQUIRED",
    billing: state,
  };
}
