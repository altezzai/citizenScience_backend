const jwt = require("jsonwebtoken");

const secretKey = process.env.JWT_SECRET;

const auth = (req, res, next) => {

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.status(401).send({ message: "Unauthorized" });

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).send({ message: "Forbidden" });
    req.user = user;
    next();
  });
};

const socketAuth = (socket, next) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication error: Access Token Required"));
    }

    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        return next(
          new Error("Authentication error: Invalid or Expired Token")
        );
      }

      socket.user = decoded;
      next();
    });
  } catch (err) {
    next(new Error("Authentication error"));
  }
};

// const socketAuth = (socket, next) => {
//   socket.user = {
//     id: 2,
//   };

//   next();
// };

// const auth = (req, res, next) => {
//   req.user = {
//     id: 2,
//   };

//   next();
// };

module.exports = { socketAuth, auth };
