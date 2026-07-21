export function formatCurrency(value) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(value) || 0);
}

export function formatPercent(value) {
  return `${Math.round(Number(value) || 0)}%`;
}

export function getImpactTone(impact) {
  if (impact === "alto") return "impact-high";
  if (impact === "medio") return "impact-medium";
  return "impact-low";
}

export function buildUpsellScripts(topProducts = []) {
  const fallback = [
    {
      title: "Bibita + contorno",
      script: "Vuole aggiungere una bibita o un contorno? È il modo più rapido per alzare il ticket senza rallentare la sala.",
      target: "Suggerimento da misurare sul locale",
    },
    {
      title: "Dolce a fine ordine",
      script: "Le segno già un dolce da condividere o preferite decidere dopo?",
      target: "Promemoria sala",
    },
  ];

  const dynamic = topProducts.slice(0, 3).map((product) => ({
    title: `Extra su ${product.name}`,
    script: `Con ${product.name} oggi sta andando fortissimo: proponi un extra coerente prima di chiudere l'ordine.`,
    target: `Spingi il prodotto #${product.rank || "top"}`,
  }));

  return [...dynamic, ...fallback].slice(0, 5);
}
