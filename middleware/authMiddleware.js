const jwt = require("jsonwebtoken");

const secretKey = process.env.JWT_SECRET;
function auth(req, res, next) {
  const authHeader = req.headers["authorization"];
  console.log(authHeader);
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.status(401).send({ message: "Unauthorized" });

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).send({ message: "Forbidden" });
    req.user = user;
    next();
  });
}

// const auth = (req, res, next) => {
//   req.user = {
//     id: 2,
//   };

//   next();
// };

module.exports = auth;
