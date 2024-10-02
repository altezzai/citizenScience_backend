const express = require("express");
const cors = require("cors");
const http = require("http");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");

dotenv.config();
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const socketHandler = require("./socketHandlers/socket");
const { auth, socketAuth } = require("./middleware/authMiddleware");
const verifyAdmin = require("./middleware/adminMiddleware");
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

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extend: true }));
app.use(auth);

app.use("/uploads", express.static("uploads"));
app.use("/users", userRoutes);
app.use("/admin", verifyAdmin, adminRoutes);

io.use(socketAuth);
io.on("connection", (socket) => {
  socketHandler(io, socket);
});

const PORT = process.env.PORT || 3000;
const startServer = async () => {
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
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Unable to connect to the databases:", error);
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  console.log("SIGINT signal received: closing HTTP server");
  await skrollsSequelize.close();
  await repositorySequelize.close();
  process.exit(0);
});

startServer();
