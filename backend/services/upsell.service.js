export function suggestUpsell(orderItems = []) {
  const map = {
    Burger: "Patatine Grandi",
    Pizza: "Bibita 1L",
    Spritz: "Tagliere Aperitivo",
  };

  return orderItems
    .map((item) => map[item.name])
    .filter(Boolean);
}