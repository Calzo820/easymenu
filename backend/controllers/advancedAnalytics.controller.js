export const getBusinessInsights = async (_req, res) => {
  return res.json({
    averageTicket: 34.8,
    bestSellingHour: "20:00",
    topTable: "Tavolo 4",
    kitchenAverageTime: "13m",
    repeatCustomers: 28,
  });
};