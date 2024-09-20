const auth = (req, res, next) => {
  req.user = {
    id: 2,
  };

  next();
};

module.exports = auth;
