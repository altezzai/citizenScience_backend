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
const DeletedMessages = require("../models/deletedmessages");
const DeletedChats = require("../models/deletedchats");

exports.sendMessage = (io, socket) => async (data) => {
  const { chatId, senderId, content, mediaUrl, replyToId, sentAt } = data;
  const transaction = await skrollsSequelize.transaction();

  try {
    const chat = await Chats.findByPk(chatId, { transaction });

    if (chat) {
      const message = await Messages.create(
        {
          chatId,
          senderId,
          content,
          mediaUrl,
          replyToId,
          overallStatus: "sent",
          sentAt: sentAt ? new Date(sentAt) : new Date(),
        },
        { transaction }
      );

      const members = await ChatMembers.findAll({
        where: { chatId },
        transaction,
      });

      await Promise.all(
        members
          .filter((member) => member.userId !== senderId)
          .map((member) =>
            MessageStatuses.create(
              {
                messageId: message.id,
                userId: member.userId,
                status: "sent",
                sentAt: sentAt ? new Date(sentAt) : new Date(),
              },
              { transaction }
            )
          )
      );

      await transaction.commit();

      io.to(chatId).emit("newMessage", message);
    } else {
      await transaction.rollback();
      console.log("Chat not found.");
      socket.emit("error", "Chat not found.");
    }
  } catch (error) {
    await transaction.rollback();
    console.error("Error sending message:", error);
    socket.emit("error", "Failed to send message.");
  }
};

//fetching messages in a particular chat

exports.getMessages =
  (io, socket) =>
  async ({ userId, chatId, page = 1, limit = 20 }) => {
    try {
      const offset = (page - 1) * limit;
      const deletedChat = await DeletedChats.findOne({
        where: {
          userId,
          chatId,
        },
      });

      let whereClause = {
        chatId,
        deleteForEveryone: false,
      };

      if (deletedChat) {
        whereClause.createdAt = { [Op.gt]: deletedChat.deletedAt };
      }

      const messages = await Messages.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        limit,
        offset,
        attributes: [
          "id",
          "mediaUrl",
          "content",
          "messageType",
          "overallStatus",
          "senderId",
          [
            Sequelize.literal(`(
            SELECT username
            FROM repository.Users AS users
            WHERE users.id = Messages.senderId
          )`),
            "username",
          ],
          [
            Sequelize.literal(`(
            SELECT profilePhoto
            FROM repository.Users AS users
            WHERE users.id = Messages.senderId
          )`),
            "profilePhoto",
          ],
        ],
        include: [
          {
            model: Messages,
            as: "replyTo",
            attributes: {
              include: [
                [
                  Sequelize.literal(`(
                    SELECT username
                    FROM repository.Users AS users
                    WHERE users.id = Messages.senderId
                  )`),
                  "username",
                ],
                [
                  Sequelize.literal(`(
                    SELECT profilePhoto
                    FROM repository.Users AS users
                    WHERE users.id = Messages.senderId
                  )`),
                  "profilePhoto",
                ],
              ],
            },
          },
        ],
        subQuery: false,
      });

      const filteredMessages = await Promise.all(
        messages.map(async (message) => {
          const deletedMessage = await DeletedMessages.findOne({
            where: {
              userId,
              messageId: message.id,
            },
          });
          return deletedMessage ? null : message;
        })
      );

      const validMessages = filteredMessages.filter(
        (message) => message !== null
      );

      socket.emit("messages", { messages: validMessages });
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      socket.emit("error", "Failed to fetch chat messages.");
    }
  };

exports.deleteMessage =
  (io, socket) =>
  async ({ userId, messageId, deleteForEveryone = false, deletedAt }) => {
    try {
      if (deleteForEveryone) {
        await Messages.update(
          { deleteForEveryone: true },
          { where: { id: messageId } }
        );
        io.emit("message deleted foe everyone", { messageId });
      } else {
        await DeletedMessages.create({
          userId,
          messageId,
          deletedAt: deletedAt ? new Date(deletedAt) : new Date(),
        });
        socket.emit("message deleted", { messageId });
      }
    } catch (error) {
      socket.emit("error", { message: "Failed to delete message" });
    }
  };
