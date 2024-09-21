const { Sequelize, Op } = require("sequelize");
const {
  skrollsSequelize,
  repositorySequelize,
} = require("../config/connection");
const Chats = require("../models/chats");
const ChatMembers = require("../models/chatmembers");

exports.joinChat =
  (io, socket) =>
  async ({ chatId }) => {
    const userId = req.user.id;
    const chat = await Chats.findByPk(chatId);
    if (!chat) {
      socket.emit("error", "Chat does not exist.");
      return;
    }

    const isMember = await ChatMembers.findOne({
      where: {
        chatId,
        userId,
      },
    });

    if (!isMember) {
      socket.emit("error", "User is not a member of this chat.");
      return;
    }

    socket.join(chatId);
    socket.emit("joinedChat", { chatId });
    socket.broadcast.to(chatId).emit("userJoined", userId);
  };

exports.leaveChat =
  (io, socket) =>
  async ({ chatId }) => {
    const userId = req.user.id;
    const chat = await Chats.findByPk(chatId);
    if (!chat) {
      socket.emit("error", "Chat does not exist.");
      return;
    }

    const isMember = await ChatMembers.findOne({
      where: {
        chatId,
        userId,
      },
    });

    if (!isMember) {
      socket.emit("error", "User is not a member of this chat.");
      return;
    }

    socket.leave(chatId);
    socket.emit("leavedChat", { chatId });
    socket.broadcast.to(chatId).emit("userLeaved", userId);
  };
