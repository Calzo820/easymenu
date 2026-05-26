io.on("connection", (socket) => {
  const role = socket.handshake.query.role;
  if (role) socket.join(role);
  console.log("Socket connesso:", role);
});