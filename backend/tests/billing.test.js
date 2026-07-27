import test from "node:test";
import assert from "node:assert/strict";
import { calculateBill, equalShareAmount } from "../lib/billing.js";

test("calcola coperto per ogni persona e sconto sul totale", () => {
  const bill = calculateBill({
    itemsSubtotal: 80,
    extraAmount: 5,
    guestCount: 4,
    coverCharge: 2.5,
    coverChargePerGuest: true,
    discountPercent: 10,
  });

  assert.deepEqual(bill, {
    itemsSubtotal: 80,
    extraAmount: 5,
    coverTotal: 10,
    gross: 95,
    discountPercent: 10,
    discountAmount: 9.5,
    totalAmount: 85.5,
  });
});

test("il coperto può essere un importo unico per il tavolo", () => {
  const bill = calculateBill({
    itemsSubtotal: 40,
    guestCount: 5,
    coverCharge: 3,
    coverChargePerGuest: false,
  });

  assert.equal(bill.coverTotal, 3);
  assert.equal(bill.totalAmount, 43);
});

test("le quote in centesimi ricompongono sempre il totale", () => {
  const shares = [1, 2, 3].map((index) => equalShareAmount(10, 3, index));
  assert.deepEqual(shares, [3.34, 3.33, 3.33]);
  assert.equal(shares.reduce((sum, value) => sum + value, 0), 10);
});

test("la divisione non perde o aggiunge centesimi con conti e coperti diversi", () => {
  for (const total of [0.5, 1, 7.99, 10, 63.47, 999.99]) {
    for (const guests of [1, 2, 3, 4, 7, 20]) {
      const totalCents = Math.round(total * 100);
      const sharesCents = Array.from(
        { length: guests },
        (_, index) => Math.round(equalShareAmount(total, guests, index + 1) * 100)
      );
      assert.equal(
        sharesCents.reduce((sum, value) => sum + value, 0),
        totalCents,
        `${total} EUR diviso tra ${guests} persone`
      );
    }
  }
});
