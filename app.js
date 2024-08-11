const express = require("express");
const cors = require("cors");
const http = require("http");
const userRoutes = require("./routes/userRoutes");
const socketHandler = require("./socketHandlers/socket");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extend: true }));

app.use("/uploads", express.static("uploads"));

app.use("/users", userRoutes);

const PORT = process.env.PORT || 3000;

io.on("connection", (socket) => {
  socketHandler(io, socket);
});

server.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
