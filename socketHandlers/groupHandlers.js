const { Sequelize, Op } = require("sequelize");
const sequelize = require("../config/connection");
const Chats = require("../models/chats");
const ChatMembers = require("../models/chatmembers");
const Messages = require("../models/messages");
const MessageStatuses = require("../models/messagestatuses");
const User = require("../models/user");

exports.addMemberToChat =
  (io, socket) =>
  async ({ chatId, userId, addedBy }) => {
    const transaction = await sequelize.transaction();
    try {
      const chat = await Chats.findOne({
        where: {
          id: chatId,
          type: { [Op.in]: ["group", "community"] },
        },
        transaction,
      });

      if (!chat) {
        socket.emit("error", "Chat not found or not a group/community.");
        return;
      }

      const adminCheck = await ChatMembers.findOne({
        where: {
          chatId,
          userId: addedBy,
          isAdmin: true,
        },
        transaction,
      });

      if (!adminCheck) {
        socket.emit("error", "Only admins can add members to the chat.");
        return;
      }

      const existingMember = await ChatMembers.findOne({
        where: {
          chatId,
          userId,
        },
        transaction,
      });

      if (existingMember) {
        socket.emit("error", "User is already a member of the chat.");
        return;
      }

      const user = await User.findOne({
        where: { id: userId },
        attributes: ["username"],
        transaction,
      });

      if (!user) {
        socket.emit("error", "User not found.");
        return;
      }

      const newMember = await ChatMembers.create(
        {
          chatId,
          userId,
          isAdmin: false,
        },
        { transaction }
      );

      const joinMessage = await Messages.create(
        {
          chatId,
          senderId: addedBy,
          content: `${user.username} has joined the chat.`,
          mediaUrl: null,
          sentAt: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      io.to(chatId).emit("memberAdded", {
        chatId,
        userId,
        addedBy,
        newMember,
        joinMessage,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error adding member to chat:", error);
      socket.emit("error", "Failed to add member to chat.");
    }
  };

exports.makeAdmin =
  (io, socket) =>
  async ({ chatId, userId, madeBy }) => {
    const transaction = await sequelize.transaction();

    try {
      const requester = await ChatMembers.findOne({
        where: { chatId, userId: madeBy },
        transaction,
      });

      if (!requester || !requester.isAdmin) {
        socket.emit(
          "error",
          "You do not have permission to make someone an admin."
        );
        await transaction.rollback();
        return;
      }

      const result = await ChatMembers.update(
        { isAdmin: true },
        { where: { chatId, userId }, transaction }
      );

      if (result[0] === 0) {
        socket.emit(
          "error",
          "Failed to make user an admin. User may not be part of the chat."
        );
        await transaction.rollback();
        return;
      }

      const user = await User.findByPk(userId, { transaction });

      const adminMessage = await Messages.create(
        {
          chatId,
          senderId: madeBy,
          content: `${user.username} has been made an admin.`,
          sentAt: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      io.to(chatId).emit("adminMade", {
        chatId,
        userId,
        madeBy,
        adminMessage,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error making user an admin:", error);
      socket.emit("error", "Failed to make user an admin.");
    }
  };




  exports.removeMemberFromChat = (io,socket) => async ({ chatId, userId, removedBy }) => {
    const transaction = await sequelize.transaction();
    try {
      const chat = await Chats.findOne({
        where: {
          id: chatId,
          type: { [Op.in]: ["group", "community"] },
        },
        transaction,
      });

      if (!chat) {
        socket.emit("error", "Chat not found or not a group/community.");
        return;
      }

      const adminCheck = await ChatMembers.findOne({
        where: {
          chatId,
          userId: removedBy,
          isAdmin: true,
        },
        transaction,
      });

      if (!adminCheck) {
        socket.emit("error", "Only admins can remove members from the chat.");
        return;
      }

      const member = await ChatMembers.findOne({
        where: {
          chatId,
          userId,
        },
        transaction,
      });

      if (!member) {
        socket.emit("error", "User is not a member of the chat.");
        return;
      }

      const user = await User.findOne({
        where: { id: userId },
        attributes: ["username"],
        transaction,
      });

      if (!user) {
        socket.emit("error", "User not found.");
        return;
      }

      await ChatMembers.destroy({
        where: {
          chatId,
          userId,
        },
        transaction,
      });

      const removalMessage = await Messages.create(
        {
          chatId,
          senderId: removedBy,
          content: `${user.username} has been removed from the chat.`,
          mediaUrl: null,
          sentAt: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      io.to(chatId).emit("memberRemoved", {
        chatId,
        userId,
        removedBy,
        removalMessage,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error removing member from chat:", error);
      socket.emit("error", "Failed to remove member from chat.");
    }
  };
