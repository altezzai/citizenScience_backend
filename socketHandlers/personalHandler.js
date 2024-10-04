const { Op, Sequelize, where } = require("sequelize");
const {
  skrollsSequelize,
  repositorySequelize,
} = require("../config/connection");
const Chats = require("../models/chats");
const ChatMembers = require("../models/chatmembers");
const DeletedChats = require("../models/deletedchats");
const Messages = require("../models/messages");
const DeletedMessages = require("../models/deletedmessages");
const User = require("../models/user");
const BlockedChats = require("../models/blockedchats");

exports.directMessage =
  (io, socket) =>
  async ({ userId, page = 1, limit = 20 }) => {
    try {
      const currentUserId = socket.user.id;

      const userChats = await ChatMembers.findAll({
        where: { userId: currentUserId },
        include: [
          {
            model: Chats,
            where: { type: "personal" },
            include: [
              {
                model: ChatMembers,
                where: { userId: userId },
              },
            ],
          },
        ],
      });

      const chat = userChats.find(
        (chatMember) => chatMember.Chat.ChatMembers.length === 1
      );
      const user = await User.findOne({
        where: { id: userId },
        attributes: ["username", "profile_image"],
      });

      if (chat) {
        const chatId = chat.chatId;

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

        socket.emit("messages", {
          exists: true,
          userDetails: user,
          messages: validMessages,
        });
      } else {
        socket.emit("messages", {
          exists: false,
          userDetails: user,
        });
      }
    } catch (error) {
      console.error("Error checking or creating direct message chat:", error);
      socket.emit("error", "Failed to check or create direct message.");
    }
  };

exports.toggleBlock =
  (io, socket) =>
  async ({ chatId, blockedUser }) => {
    try {
      const blockedBy = socket.user.id;

      const chat = await Chats.findByPk(chatId, {
        where: { type: "personal" },
      });
      if (!chat) {
        return socket.emit("error", "Not a personal chat");
      }

      const chatMembers = await ChatMembers.findAll({
        where: {
          chatId,
          userId: {
            [Op.in]: [blockedBy, blockedUser],
          },
        },
      });

      if (chatMembers.length !== 2) {
        return socket.emit("error", "Both users must be members of the chat");
      }

      const isBlocked = await BlockedChats.findOne({
        where: { chatId, blockedBy, blockedUser },
      });

      if (isBlocked) {
        await BlockedChats.destroy({
          where: {
            chatId,
            blockedBy,
            blockedUser,
          },
        });
      } else {
        await BlockedChats.create({ chatId, blockedBy, blockedUser });
      }

      socket.emit(
        "blockStatus",
        isBlocked ? "Unblocked successfully" : "Blocked successfully"
      );
    } catch (error) {
      console.error("error on blocking", error);
      socket.emit("error", "Failed to block user");
    }
  };
