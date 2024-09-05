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

exports.getCommunityMessagesAndFeeds =
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
          "createdAt",
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

      const communityFeeds = await CommunityFeeds.findAll({
        where: { chatId },
        include: [
          {
            model: Feed,
            attributes: ["id", "fileName", "description", "createdAt"],
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
        where: { userId: memberIds },
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
