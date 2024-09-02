const { Op, Sequelize } = require("sequelize");
const {
  skrollsSequelize,
  repositorySequelize,
} = require("../../config/connection");
const User = require("../../models/user");
const Followers = require("../../models/followers");
const ChatMembers = require("../../models/chatmembers");
const Chats = require("../../models/chats");
const Messages = require("../../models/messages");
const DeletedMessages = require("../../models/deletedmessages");
const MessageStatuses = require("../../models/messagestatuses");
const Hashtags = require("../../models/hashtags");

const searchUsers = async (req, res) => {
  const userId = parseInt(req.query.userId);
  const searchQuery = req.query.search;
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    const matchingUsers = await User.findAll({
      where: {
        username: { [Op.like]: `%${searchQuery}%` },
        id: { [Op.not]: userId },
      },
      attributes: ["id", "username", "profilePhoto"],
      raw: true,
    });

    if (matchingUsers.length === 0) {
      return res.status(200).json([]);
    }

    const matchingUserIds = matchingUsers.map((user) => user.id);

    const followingMatches = await Followers.findAll({
      where: {
        followerId: userId,
        followingId: { [Op.in]: matchingUserIds },
      },
      attributes: ["followingId"],
      raw: true,
    });

    const followingIds = followingMatches.map((f) => f.followingId);

    const followerMatches = await Followers.findAll({
      where: {
        followingId: userId,
        followerId: { [Op.in]: matchingUserIds },
      },
      attributes: ["followerId"],
      raw: true,
    });

    const followerIds = followerMatches.map((f) => f.followerId);

    const otherUserIds = matchingUserIds.filter(
      (id) => !followingIds.includes(id) && !followerIds.includes(id)
    );

    const orderedIds = [...followingIds, ...followerIds, ...otherUserIds];

    const users = await User.findAll({
      where: { id: { [Op.in]: orderedIds } },
      attributes: ["id", "username", "profilePhoto"],
      order: [Sequelize.literal(`FIELD(id, ${orderedIds.join(",")})`)],
      limit,
      offset,
      raw: true,
    });

    res.status(200).json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const searchHashtags = async (req, res) => {
  const searchQuery = req.query.q;
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    const hashtags = await Hashtags.findAll({
      where: {
        hashtag: {
          [Op.like]: `%${searchQuery}%`,
        },
      },
      attributes: ["id", "hashtag", "usageCount"],
      order: [["usageCount", "DESC"]],
      limit,
      offset,
    });

    res.status(200).json(hashtags);
  } catch (error) {
    console.error("Error searching hashtags:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const searchMembers = async (req, res) => {
  const { chatId } = req.params;
  const userId = parseInt(req.query.userId);
  const searchItem = req.query.q;

  try {
    const followers = await Followers.findAll({
      where: {
        followerId: userId,
      },
      attributes: ["followingId"],
    });

    const followerIds = followers.map((follower) => follower.followingId);

    const users = await User.findAll({
      where: {
        id: {
          [Op.in]: followerIds,
        },
        username: {
          [Op.like]: `%${searchItem}%`,
        },
      },
      attributes: ["id", "username", "profilePhoto"],
    });

    const userIds = users.map((user) => user.id);

    const chatMembers = await ChatMembers.findAll({
      where: {
        chatId: chatId,
        userId: {
          [Op.in]: userIds,
        },
      },
      attributes: ["userId"],
    });

    const chatMemberIds = chatMembers.map((member) => member.userId);

    const filteredUsers = users.filter(
      (user) => !chatMemberIds.includes(user.id)
    );
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in searching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const searchConversations = async (req, res) => {
  const userId = parseInt(req.query.userId);
  const searchString = req.query.q;

  try {
    const conversations = await Chats.findAll({
      include: [
        {
          model: ChatMembers,
          attributes: [
            "userId",
            [
              Sequelize.literal(`(
                  SELECT username from repository.Users AS users WHERE users.id = ChatMembers.userId)`),
              "username",
            ],
            [
              Sequelize.literal(`(
                  SELECT profilePhoto
                  FROM repository.Users AS users
                  WHERE users.id = ChatMembers.userId
                )`),
              "profilePhoto",
            ],
          ],
        },
        {
          model: Messages,
          attributes: {
            include: [
              [
                Sequelize.literal(`(
                    SELECT username from repository.Users AS users WHERE users.id = Messages.senderId)`),
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
          where: {
            content: {
              [Op.like]: `%${searchString}%`,
            },
          },
          required: false,
        },
      ],
      where: {
        [Op.or]: [
          {
            name: {
              [Op.like]: `%${searchString}%`,
            },
          },
          {
            type: "personal",
            "$ChatMembers.username$": {
              [Op.like]: `%${searchString}%`,
            },
          },
        ],
        id: {
          [Op.in]: Sequelize.literal(
            `(SELECT chatId FROM ChatMembers WHERE userId = ${userId})`
          ),
        },
      },
      order: [["updatedAt", "DESC"]],
      raw: true,
    });

    const deletedMessages = await DeletedMessages.findAll({
      where: { userId },
      attributes: ["messageId"],
    });

    const deletedMessageIds = deletedMessages.map((dm) => dm.messageId);

    let relatedChats = [];
    let relatedMessages = [];

    conversations.forEach((conversation) => {
      const chatMembers = conversation.ChatMembers || [];
      const messages = conversation.Messages || [];

      const validMessages = messages.filter((message) => {
        return (
          !message.deleteForEveryone && !deletedMessageIds.includes(message.id)
        );
      });

      const lastMessage = validMessages.length > 0 ? validMessages[0] : null;

      const isDeletedChat = conversation.DeletedChats
        ? conversation.DeletedChats.length > 0
        : false;
      const lastValidMessageDate = lastMessage
        ? lastMessage.createdAt
        : new Date(0);
      const deletedChatDate = isDeletedChat
        ? conversation.DeletedChats[0].deletedAt
        : new Date(0);

      if (!isDeletedChat || lastValidMessageDate > deletedChatDate) {
        relatedChats.push({
          chatId: conversation.id,
          type: conversation.type,
          name:
            conversation.type === "personal" && chatMembers.length > 0
              ? chatMembers[0].username
              : conversation.name,
          icon:
            conversation.type === "personal" && chatMembers.length > 0
              ? chatMembers[0].profilePhoto
              : conversation.icon,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                senderId: lastMessage.senderId,
                senderUsername: lastMessage.username
                  ? lastMessage.username
                  : null,
                status:
                  lastMessage.senderId === userId
                    ? lastMessage.overallStatus
                    : null,
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadMessagesCount: 0,
        });

        validMessages.forEach((message) => {
          relatedMessages.push({
            id: message.id,
            content: message.content,
            chatId: conversation.id,
            chatName:
              conversation.type === "personal" && chatMembers.length > 0
                ? chatMembers[0].username
                : conversation.name,
            senderId: message.senderId,
            senderUsername: message.username ? message.username : null,
            status: message.senderId === userId ? message.overallStatus : null,
            createdAt: message.createdAt,
          });
        });
      }
    });

    relatedChats = await Promise.all(
      relatedChats.map(async (conversation) => {
        const unreadMessagesCount = await MessageStatuses.count({
          include: [
            {
              model: Messages,
              attributes: [],
              where: {
                chatId: conversation.chatId,
                createdAt: {
                  [Op.gt]: conversation.lastMessage
                    ? conversation.lastMessage.createdAt
                    : new Date(0),
                },
                deleteForEveryone: false,
              },
            },
          ],
          where: {
            userId: userId,
            status: {
              [Op.in]: ["sent", "received"],
            },
          },
        });

        return {
          ...conversation,
          unreadMessagesCount,
        };
      })
    );

    res.status(200).json({
      searchDetails: {
        relatedChats,
        relatedMessages,
      },
    });
  } catch (error) {
    console.error("Error searching conversations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  searchUsers,
  searchHashtags,
  searchMembers,
  searchConversations,
};
