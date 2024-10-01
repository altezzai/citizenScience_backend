const jwt = require("jsonwebtoken");
const secretKey = process.env.JWT_SECRET;

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

module.exports = socketAuth;
