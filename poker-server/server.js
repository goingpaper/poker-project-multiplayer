const httpServer = require("http").createServer();
const io = require("socket.io")(httpServer, {
  // ...
});
const { 
  v1: uuidv1,
  v4: uuidv4,
} = require('uuid');

const connected = {};

io.on("connection", (socket) => {
  console.log("connection");
  const clientId = uuidv4();
  connected[clientId] = true;
  socket.on("disconnect", (reason) => {
    delete connected[clientId];
    socket.emit("playerleft");
  });
  const connectedCount = Object.keys(connected).length;

  if (connectedCount == 2) {
    socket.emit("started", "tobi", (data) => {
      console.log(data); // data will be "woot"
    });
  }
  console.log(connected);
});

httpServer.listen(3000);

// create a callback to wait until there are two concurrent connections




