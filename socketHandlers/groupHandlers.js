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
const BlockedChats = require("../models/blockedchats");

exports.addMemberToChat =
  (io, socket) =>
  async ({ chatId, userId }) => {
    const skrollsTransaction = await skrollsSequelize.transaction();
    const repositoryTransaction = await repositorySequelize.transaction();
    try {
      const addedBy = socket.user.id;
      const chat = await Chats.findOne({
        where: {
          id: chatId,
          type: { [Op.in]: ["group", "community"] },
        },
        transaction: skrollsTransaction,
      });

      if (!chat) {
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return socket.emit("error", "Chat not found or not a group/community.");
      }

      const blockedChat = await BlockedChats.findOne({
        where: {
          chatId,
          [Op.or]: [
            { blockedBy: addedBy, blockedUser: userId },
            { blockedBy: userId, blockedUser: addedBy },
          ],
        },
      });

      if (blockedChat) {
        if (blockedChat.blockedBy === addedBy) {
          await skrollsTransaction.rollback();
          await repositoryTransaction.rollback();
          return socket.emit("error", "You have blocked this chat.");
        } else {
          await skrollsTransaction.rollback();
          await repositoryTransaction.rollback();
          return socket.emit("error", "You have been blocked in this chat.");
        }
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
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return socket.emit("error", "Only admins can add members to the chat.");
      }

      const existingMember = await ChatMembers.findOne({
        where: {
          chatId,
          userId,
        },
        transaction: skrollsTransaction,
      });

      if (existingMember) {
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return socket.emit("error", "User is already a member of the chat.");
      }

      const user = await User.findOne({
        where: { id: userId },
        attributes: ["username"],
        transaction: repositoryTransaction,
      });

      if (!user) {
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return socket.emit("error", "User not found.");
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
  async ({ chatId, userId }) => {
    const skrollsTransaction = await skrollsSequelize.transaction();
    const repositoryTransaction = await repositorySequelize.transaction();
    try {
      const madeBy = socket.user.id;
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

      socket.emit("adminMade", {
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

exports.dismissAdmin =
  (io, socket) =>
  async ({ chatId, userId }) => {
    const skrollsTransaction = await skrollsSequelize.transaction();
    const repositoryTransaction = await repositorySequelize.transaction();

    try {
      const dismissedBy = socket.user.id;
      const requester = await ChatMembers.findOne({
        where: { chatId, userId: dismissedBy },
        transaction: skrollsTransaction,
      });

      if (!requester || !requester.isAdmin) {
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return socket.emit(
          "error",
          "You do not have permission to dismiss an admin."
        );
      }

      const chat = await Chats.findByPk(chatId, {
        transaction: skrollsTransaction,
      });

      if (chat.createdBy === userId) {
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return socket.emit(
          "error",
          "Cannot remove admin privileges from the chat creator."
        );
      }

      const result = await ChatMembers.update(
        { isAdmin: false },
        { where: { chatId, userId }, transaction: skrollsTransaction }
      );

      if (result[0] === 0) {
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return socket.emit(
          "error",
          "Failed to dismiss admin. User may not be part of the chat or not an admin."
        );
      }

      const user = await User.findByPk(userId, {
        transaction: repositoryTransaction,
      });

      const adminMessage = await Messages.create(
        {
          chatId,
          senderId: dismissedBy,
          content: `${user.username} has been dismissed as an admin.`,
          messageType: "system",
          overallStatus: "sent",
          sentAt: new Date(),
        },
        { transaction: skrollsTransaction }
      );

      await skrollsTransaction.commit();
      await repositoryTransaction.commit();

      socket.emit("adminDismissed", {
        chatId,
        userId,
        dismissedBy,
        adminMessage,
      });
    } catch (error) {
      await skrollsTransaction.rollback();
      await repositoryTransaction.rollback();
      console.error("Error dismissing admin:", error);
      socket.emit("error", "Failed to dismiss admin.");
    }
  };

exports.removeMemberFromChat =
  (io, socket) =>
  async ({ chatId, userId }) => {
    const skrollsTransaction = await skrollsSequelize.transaction();
    const repositoryTransaction = await repositorySequelize.transaction();
    try {
      const removedBy = socket.user.id;
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

      if (chat.createdBy === userId) {
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return socket.emit("error", "Cannot remove the chat creator.");
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
      socket.emit("memberRemoved", {
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

exports.leaveChat =
  (io, socket) =>
  async ({ chatId }) => {
    const skrollsTransaction = await skrollsSequelize.transaction();
    const repositoryTransaction = await repositorySequelize.transaction();
    try {
      const userId = socket.user.id;

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

      const member = await ChatMembers.findOne({
        where: {
          chatId,
          userId,
        },
        transaction: skrollsTransaction,
      });

      if (!member) {
        socket.emit("error", "You are not a member of this chat.");
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return;
      }

      if (member.isAdmin) {
        const otherAdmins = await ChatMembers.findAll({
          where: {
            chatId,
            userId: { [Op.ne]: userId },
            isAdmin: true,
          },
          transaction: skrollsTransaction,
        });

        if (otherAdmins.length === 0) {
          socket.emit(
            "error",
            "You are the last admin. Please assign a new admin before leaving the chat."
          );
          await skrollsTransaction.rollback();
          await repositoryTransaction.rollback();
          return;
        }
      }

      await ChatMembers.destroy({
        where: {
          chatId,
          userId,
        },
        transaction: skrollsTransaction,
      });

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

      const exitMessage = await Messages.create(
        {
          chatId,
          senderId: userId,
          content: `${user.username} has left the chat.`,
          messageType: "system",
          mediaUrl: null,
          overallStatus: "sent",
          sentAt: new Date(),
        },
        { transaction: skrollsTransaction }
      );

      await skrollsTransaction.commit();
      await repositoryTransaction.commit();

      socket.emit("memberLeaved", {
        chatId,
        userId,
        exitMessage,
      });
    } catch (error) {
      await skrollsTransaction.rollback();
      await repositoryTransaction.rollback();
      console.error("Error leaving chat:", error);
      socket.emit("error", "Failed to exit the chat.");
    }
  };
