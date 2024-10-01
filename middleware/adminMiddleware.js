const verifyAdmin = (req, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (user.role && user.role === "admin") {
    return next();
  }

  return res.status(403).json({ message: "Forbidden: Admins only" });
};

module.exports = verifyAdmin;
