const { Sequelize, Op, where } = require("sequelize");
const {
  skrollsSequelize,
  repositorySequelize,
} = require("../config/connection");
const Messages = require("../models/messages");
const DeletedChats = require("../models/deletedchats");
const DeletedMessages = require("../models/deletedmessages");
const CommunityHashtags = require("../models/communityhashtags");
const CommunityFeeds = require("../models/communityfeeds");
const Feed = require("../models/feed");
const PostHashtags = require("../models/posthashtags");

const Hashtags = require("../models/hashtags");
const ChatMembers = require("../models/chatmembers");
const Chats = require("../models/chats");
const User = require("../models/user");

exports.joinChat =
  (io, socket) =>
  async ({ chatId }) => {
    const skrollsTransaction = await skrollsSequelize.transaction();
    const repositoryTransaction = await repositorySequelize.transaction();

    try {
      const userId = socket.user.id;

      const chat = await Chats.findOne({
        where: {
          id: chatId,
          type: "community",
        },
        transaction: skrollsTransaction,
      });

      if (!chat) {
        socket.emit("error", "Chat does not exist or is not a community.");
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return;
      }

      let isMember = await ChatMembers.findOne({
        where: {
          chatId,
          userId,
        },
        transaction: skrollsTransaction,
      });

      if (isMember) {
        socket.emit("error", "User is already a member of the community.");
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return;
      } else {
        await ChatMembers.create(
          {
            chatId,
            userId,
            isAdmin: false,
          },
          { transaction: skrollsTransaction }
        );

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

        await Messages.create(
          {
            chatId,
            senderId: userId,
            content: `${user.username} has joined the community.`,
            messageType: "system",
            mediaUrl: null,
            overallStatus: "sent",
            sentAt: new Date(),
          },
          { transaction: skrollsTransaction }
        );
        await skrollsTransaction.commit();
        await repositoryTransaction.commit();

        socket.emit("joinedChat", { chatId });
        // socket.join(chatId);
      }
    } catch (error) {
      await skrollsTransaction.rollback();
      await repositoryTransaction.rollback();
      console.error("Error joining chat:", error);
      socket.emit("error", "An error occurred while joining the chat.");
    }
  };

exports.getCommunityMessagesAndFeeds =
  (io, socket) =>
  async ({ chatId, page = 1, limit = 20 }) => {
    try {
      const userId = socket.user.id;

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

      const communityFeeds = await CommunityFeeds.findAll({
        where: { chatId },
        include: [
          {
            model: Feed,
            attributes: ["id", "fileName", "description", "createdAt"],
            where: {
              feedActive: true,

              [Sequelize.Op.and]: [
                Sequelize.literal(`(
                  SELECT isActive
                  FROM repository.Users
                  WHERE repository.Users.id = Feed.userId
                ) = true`),
                Sequelize.literal(`(
                  SELECT citizenActive
                  FROM repository.Users
                  WHERE repository.Users.id = Feed.userId
                ) = true`),
              ],
            },
          },
        ],
        limit,
        offset,
      });

      const chatMembers = await ChatMembers.findAll({
        where: { chatId },
        attributes: ["userId"],
      });

      const memberIds = chatMembers.map((member) => member.userId);

      const communityHashtag = await CommunityHashtags.findAll({
        where: { chatId },
        attributes: ["hashtagId"],
      });

      const cHashtagIds = communityHashtag.map((i) => i.hashtagId);

      const memberFeeds = await Feed.findAll({
        where: {
          userId: memberIds,
          feedActive: true,

          [Sequelize.Op.and]: [
            Sequelize.literal(`(
              SELECT isActive
              FROM repository.Users
              WHERE repository.Users.id = Feed.userId
            ) = true`),
            Sequelize.literal(`(
              SELECT citizenActive
              FROM repository.Users
              WHERE repository.Users.id = Feed.userId
            ) = true`),
          ],
        },
        include: [
          {
            model: PostHashtags,
            attributes: [],
            include: {
              model: Hashtags,
              where: { id: cHashtagIds },
              attributes: [],
              required: true,
            },
          },
        ],
        attributes: ["id", "fileName", "description", "createdAt"],
        limit,
        offset,
      });

      const communityFeedIds = communityFeeds.map((feed) => feed.Feed.id); // Get the IDs of feeds in communityFeeds

      const uniqueMemberFeeds = memberFeeds.filter(
        (feed) => !communityFeedIds.includes(feed.id)
      );

      const combinedData = [
        ...validMessages.map((msg) => ({
          ...msg.toJSON(),
          type: "message",
        })),
        ...communityFeeds.map((communityFeed) => ({
          ...communityFeed.Feed.toJSON(),
          type: "feed",
        })),
        ...uniqueMemberFeeds.map((memberFeed) => ({
          ...memberFeed.toJSON(),
          type: "feed",
        })),
      ];

      combinedData.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      const paginatedResults = combinedData.slice(offset, offset + limit);

      socket.emit("communityMessagesAndFeeds", {
        data: paginatedResults,
        totalCount: combinedData.length,
        page,
        totalPages: Math.ceil(combinedData.length / limit),
      });
    } catch (error) {
      console.error("Error fetching community messages and feeds:", error);
      socket.emit("error", "Failed to fetch community messages and feeds.");
    }
  };
