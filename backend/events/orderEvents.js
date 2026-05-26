export const emitNewOrder = (io, order) => {
  io.to("kitchen").emit("new_order_kitchen", order);

  const drinks = order.items.filter(i => i.category === "drink");
  if (drinks.length) {
    io.to("bar").emit("new_order_bar", { ...order, items: drinks });
  }

  io.to("cashier").emit("new_order_cashier", order);
};