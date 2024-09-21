const express = require("express");
const cors = require("cors");
const http = require("http");
const userRoutes = require("./routes/userRoutes");
const socketHandler = require("./socketHandlers/socket");
const auth = require("./middleware/authMiddleware");
const socketAuth = require("./middleware/socketAuthMiddleware");
const {
  skrollsSequelize,
  repositorySequelize,
} = require("./config/connection");

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

app.use(auth);

app.use("/uploads", express.static("uploads"));

app.use("/users", userRoutes);

const PORT = process.env.PORT || 3000;
const syncDatabase = async () => {
  try {
    await skrollsSequelize.authenticate();
    console.log(
      "Connection to skrolls database has been established successfully."
    );

    await repositorySequelize.authenticate();
    console.log(
      "Connection to repository database has been established successfully."
    );

    await skrollsSequelize.sync();
    console.log("skrolls database synchronized.");

    await repositorySequelize.sync();
    console.log("repository database synchronized.");

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to connect to the databases:", error);
  }
};

io.use(socketAuth);

io.on("connection", (socket) => {
  socketHandler(io, socket);
});

syncDatabase();
