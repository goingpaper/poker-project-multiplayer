const io = require("socket.io-client");

const socket = io("ws://localhost:3000", {
  reconnectionDelayMax: 10000,
});
export default socket;