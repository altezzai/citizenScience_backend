const auth = (req, res, next) => {
  req.user = {
    id: 5,
  };

  next();
};

module.exports = auth;
