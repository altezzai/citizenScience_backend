const socketAuth = (socket, next) => {
  socket.user = {
    id: 2,
  };

  next();
};

module.exports = socketAuth;
