export function moneyNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function roundMoney(value) {
  return Math.round((moneyNumber(value) + Number.EPSILON) * 100) / 100;
}

export function clampGuestCount(value, fallback = 1) {
  const guests = Math.trunc(moneyNumber(value, fallback));
  return Math.min(100, Math.max(1, guests));
}

export function coverTotal({ guestCount, coverCharge, coverChargePerGuest }) {
  const charge = Math.max(0, moneyNumber(coverCharge));
  return roundMoney(coverChargePerGuest === false ? charge : charge * clampGuestCount(guestCount));
}

export function calculateBill({
  itemsSubtotal,
  extraAmount,
  guestCount,
  coverCharge,
  coverChargePerGuest,
  discountPercent,
  discountAmount,
}) {
  const subtotal = Math.max(0, moneyNumber(itemsSubtotal));
  const extras = Math.max(0, moneyNumber(extraAmount));
  const covers = coverTotal({ guestCount, coverCharge, coverChargePerGuest });
  const gross = roundMoney(subtotal + extras + covers);
  const percent = Math.min(100, Math.max(0, moneyNumber(discountPercent)));
  const discount = percent > 0
    ? roundMoney((gross * percent) / 100)
    : Math.min(gross, Math.max(0, moneyNumber(discountAmount)));
  return {
    itemsSubtotal: roundMoney(subtotal),
    extraAmount: roundMoney(extras),
    coverTotal: covers,
    gross,
    discountPercent: percent,
    discountAmount: discount,
    totalAmount: roundMoney(Math.max(0, gross - discount)),
  };
}

export function equalShareAmount(totalAmount, shareCount, shareIndex) {
  const count = clampGuestCount(shareCount);
  const index = Math.min(count, Math.max(1, Math.trunc(moneyNumber(shareIndex, 1))));
  const totalCents = Math.max(0, Math.round(moneyNumber(totalAmount) * 100));
  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents - baseCents * count;
  return (baseCents + (index <= remainder ? 1 : 0)) / 100;
}
