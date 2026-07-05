io.on("connection", (socket) => {
  const role = socket.handshake.query.role;
  if (role) socket.join(role);
  if (process.env.NODE_ENV !== "production") console.log("Socket connesso:", role);
});
