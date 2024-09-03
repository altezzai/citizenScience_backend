const { Sequelize, Op } = require("sequelize");
const {
  skrollsSequelize,
  repositorySequelize,
} = require("../config/connection");
const Chats = require("../models/chats");
const ChatMembers = require("../models/chatmembers");
const Messages = require("../models/messages");
const MessageStatuses = require("../models/messagestatuses");
const User = require("../models/user");

exports.addMemberToChat =
  (io, socket) =>
  async ({ chatId, userId, addedBy }) => {
    const skrollsTransaction = await skrollsSequelize.transaction();
    const repositoryTransaction = await repositorySequelize.transaction();
    try {
      const chat = await Chats.findOne({
        where: {
          id: chatId,
          type: { [Op.in]: ["group", "community"] },
        },
        transaction: skrollsTransaction,
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
        attributes: {
          include: [
            [
              Sequelize.literal(`(
                SELECT username
                FROM repository.Users AS users
                WHERE users.id = ChatMembers.userId
              )`),
              "username",
            ],
          ],
        },
        transaction: skrollsTransaction,
        raw: true,
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
        transaction: skrollsTransaction,
      });

      if (existingMember) {
        socket.emit("error", "User is already a member of the chat.");
        return;
      }

      const user = await User.findOne({
        where: { id: userId },
        attributes: ["username"],
        transaction: repositoryTransaction,
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
        { transaction: skrollsTransaction }
      );

      const joinMessage = await Messages.create(
        {
          chatId,
          senderId: addedBy,
          content: `${adminCheck.username} added ${user.username} to the the chat.`,
          messageType: "system",
          mediaUrl: null,
          overallStatus: "sent",
          sentAt: new Date(),
        },
        { transaction: skrollsTransaction }
      );

      await skrollsTransaction.commit();
      await repositoryTransaction.commit();

      io.to(chatId).emit("memberAdded", {
        chatId,
        userId,
        addedBy,
        newMember,
        joinMessage,
      });
    } catch (error) {
      await skrollsTransaction.rollback();
      await repositoryTransaction.rollback();
      console.error("Error adding member to chat:", error);
      socket.emit("error", "Failed to add member to chat.");
    }
  };

exports.makeAdmin =
  (io, socket) =>
  async ({ chatId, userId, madeBy }) => {
    const skrollsTransaction = await skrollsSequelize.transaction();
    const repositoryTransaction = await repositorySequelize.transaction();
    try {
      const requester = await ChatMembers.findOne({
        where: { chatId, userId: madeBy },
        transaction: skrollsTransaction,
      });

      if (!requester || !requester.isAdmin) {
        socket.emit(
          "error",
          "You do not have permission to make someone an admin."
        );
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return;
      }

      const result = await ChatMembers.update(
        { isAdmin: true },
        { where: { chatId, userId }, transaction: skrollsTransaction }
      );

      if (result[0] === 0) {
        socket.emit(
          "error",
          "Failed to make user an admin. User may not be part of the chat."
        );
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return;
      }

      const user = await User.findByPk(userId, {
        transaction: repositoryTransaction,
      });

      const adminMessage = await Messages.create(
        {
          chatId,
          senderId: madeBy,
          content: `${user.username} has been made an admin.`,
          messageType: "system",
          overallStatus: "sent",
          sentAt: new Date(),
        },
        { transaction: skrollsTransaction }
      );

      await skrollsTransaction.commit();
      await repositoryTransaction.commit();

      io.to(chatId).emit("adminMade", {
        chatId,
        userId,
        madeBy,
        adminMessage,
      });
    } catch (error) {
      await skrollsTransaction.rollback();
      await repositoryTransaction.rollback();
      console.error("Error making user an admin:", error);
      socket.emit("error", "Failed to make user an admin.");
    }
  };

exports.removeMemberFromChat =
  (io, socket) =>
  async ({ chatId, userId, removedBy }) => {
    const skrollsTransaction = await skrollsSequelize.transaction();
    const repositoryTransaction = await repositorySequelize.transaction();
    try {
      const chat = await Chats.findOne({
        where: {
          id: chatId,
          type: { [Op.in]: ["group", "community"] },
        },
        transaction: skrollsTransaction,
      });

      if (!chat) {
        socket.emit("error", "Chat not found or not a group/community.");
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return;
      }

      const adminCheck = await ChatMembers.findOne({
        where: {
          chatId,
          userId: removedBy,
          isAdmin: true,
        },
        transaction: skrollsTransaction,
      });

      if (!adminCheck) {
        socket.emit("error", "Only admins can remove members from the chat.");
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return;
      }

      const member = await ChatMembers.findOne({
        where: {
          chatId,
          userId,
        },
        transaction: skrollsTransaction,
      });

      if (!member) {
        socket.emit("error", "User is not a member of the chat.");
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return;
      }

      const user = await User.findOne({
        where: { id: userId },
        attributes: ["username"],
        transaction: repositoryTransaction,
      });

      if (!user) {
        socket.emit("error", "User not found.");
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return;
      }

      await ChatMembers.destroy({
        where: {
          chatId,
          userId,
        },
        transaction: skrollsTransaction,
      });

      const removalMessage = await Messages.create(
        {
          chatId,
          senderId: removedBy,
          content: `${user.username} has been removed from the chat.`,
          messageType: "system",
          mediaUrl: null,
          overallStatus: "sent",
          sentAt: new Date(),
        },
        { transaction: skrollsTransaction }
      );

      await skrollsTransaction.commit();
      await repositoryTransaction.commit();
      io.to(chatId).emit("memberRemoved", {
        chatId,
        userId,
        removedBy,
        removalMessage,
      });
    } catch (error) {
      await skrollsTransaction.rollback();
      await repositoryTransaction.rollback();
      console.error("Error removing member from chat:", error);
      socket.emit("error", "Failed to remove member from chat.");
    }
  };
