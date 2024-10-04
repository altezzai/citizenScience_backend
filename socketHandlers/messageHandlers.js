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
const BlockedChats = require("../models/blockedchats");

exports.sendMessage = (io, socket) => async (data) => {
  const { chatId, content, mediaUrl, replyToId, sentAt } = data;
  if (
    (!content || content.trim() === "") &&
    (!mediaUrl || mediaUrl.trim() === "")
  ) {
    return res.status(400).json({
      error: "At least one of 'content' or 'mediaUrl' is required.",
    });
  }
  const transaction = await skrollsSequelize.transaction();

  try {
    const senderId = socket.user.id;
    const chat = await Chats.findByPk(chatId, { transaction });
    if (!chat) {
      socket.emit("error", "Chat not found.");
      return;
    }
    const isMember = await ChatMembers.findOne({
      where: {
        chatId,
        userId: senderId,
      },
      transaction,
    });

    if (!isMember) {
      socket.emit("error", "User is not a member of this chat.");
      return;
    }

    if (chat.type === "personal") {
      const otherUserId = await ChatMembers.findOne({
        where: {
          chatId,
          userId: { [Op.ne]: senderId },
        },
        transaction,
      }).then((member) => member.userId);

      const blockedChat = await BlockedChats.findOne({
        where: {
          chatId,
          [Op.or]: [
            { blockedBy: senderId, blockedUser: otherUserId },
            { blockedBy: otherUserId, blockedUser: senderId },
          ],
        },
      });

      if (blockedChat) {
        if (blockedChat.blockedBy === senderId) {
          return socket.emit("error", "You have blocked this chat.");
        } else {
          return socket.emit("error", "You have been blocked in this chat.");
        }
      }
    }

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

    socket.emit("newMessage", message);
  } catch (error) {
    await transaction.rollback();
    console.error("Error sending message:", error);
    socket.emit("error", "Failed to send message.");
  }
};

//fetching messages in a particular chat

exports.getMessages =
  (io, socket) =>
  async ({ chatId, page = 1, limit = 20 }) => {
    try {
      const userId = socket.user.id;
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

      const chat = await Chats.findByPk(chatId);
      let blockStatus;

      if (chat.type === "personal") {
        const otherUserId = await ChatMembers.findOne({
          where: {
            chatId,
            userId: { [Op.ne]: userId },
          },
        }).then((member) => member.userId);

        const blockedChat = await BlockedChats.findOne({
          where: {
            chatId,
            [Op.or]: [
              {
                blockedBy: userId,
                blockedUser: otherUserId,
              },
              {
                blockedBy: otherUserId,
                blockedUser: userId,
              },
            ],
          },
        });

        if (blockedChat) {
          if (blockedChat.blockedBy === userId) {
            blockStatus = "You have blocked this chat";
          } else {
            blockStatus = "You have been blocked in this chat";
          }
        }
      }

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
        messageActive: true,
      };

      if (deletedChat) {
        whereClause.createdAt = { [Op.gt]: deletedChat.deletedAt };
      }

      const { count, rows: messages } = await Messages.findAndCountAll({
        distinct: true,
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
          "createdAt",
          [
            Sequelize.literal(`(
              SELECT 
                CASE
                  WHEN (isActive = false OR citizenActive = false)
                  THEN 'skrolls.user'
                  ELSE username
                END
              FROM repository.Users
              WHERE repository.Users.id = Messages.senderId
            )`),
            "username",
          ],

          [
            Sequelize.literal(`(
              SELECT 
                CASE
                  WHEN (isActive = false OR citizenActive = false)
                  THEN NULL
                  ELSE profile_image
                END
              FROM repository.Users
              WHERE repository.Users.id = Messages.senderId
            )`),
            "profilePhoto",
          ],
        ],
        include: [
          {
            model: Messages,
            as: "replyTo",
            required: false,
            where: { messageActive: true },
            attributes: {
              include: [
                [
                  Sequelize.literal(`(
                    SELECT 
                      CASE
                        WHEN (isActive = false OR citizenActive = false)
                        THEN 'skrolls.user'
                        ELSE username
                      END
                    FROM repository.Users
                    WHERE repository.Users.id = Messages.senderId
                  )`),
                  "username",
                ],

                [
                  Sequelize.literal(`(
                    SELECT 
                      CASE
                        WHEN (isActive = false OR citizenActive = false)
                        THEN NULL
                        ELSE profile_image
                      END
                    FROM repository.Users
                    WHERE repository.Users.id = Messages.senderId
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

      const totalPages = Math.ceil(count / limit);

      socket.emit("messages", {
        totalConversations: count,
        totalPages,
        currentPage: page,
        blockStatus,
        messages: validMessages,
      });
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      socket.emit("error", "Failed to fetch chat messages.");
    }
  };

exports.deleteMessage =
  (io, socket) =>
  async ({ messageId, deleteForEveryone = false, deletedAt }) => {
    try {
      const userId = socket.user.id;

      const message = await Messages.findByPk(messageId);
      if (!message) {
        return socket.emit("error", { message: "Message not found" });
      }

      const isAdmin = await ChatMembers.findOne({
        where: {
          chatId: message.chatId,
          userId,
          isAdmin: true,
        },
      });

      const isSender = userId === message.senderId;
      const canDelete = isSender || isAdmin;

      if (!canDelete) {
        return socket.emit("error", {
          message: "You don't have permission to delete this message",
        });
      }

      if (deleteForEveryone) {
        const content = isSender ? "Deleted by user" : "Deleted by admin";

        await Messages.update(
          { deleteForEveryone: true, content, messageType: "chatAction" },
          { where: { id: messageId, senderId: userId } }
        );

        socket.emit("deleted", {
          message: "message deleted for everyone",
          messageId,
        });
      } else {
        await DeletedMessages.create({
          userId,
          messageId,
          deletedAt: deletedAt ? new Date(deletedAt) : new Date(),
        });
        socket.emit("deleted", { message: "message deleted", messageId });
      }
    } catch (error) {
      socket.emit("error", { message: "Failed to delete message" });
    }
  };
