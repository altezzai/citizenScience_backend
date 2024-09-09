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
const CommunityHashtags = require("../../models/communityhashtags");

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
      attributes: ["id", "username", "profile_image"],
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
      attributes: ["id", "username", "profile_image"],
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

const searchFeedHashtags = async (req, res) => {
  const userId = parseInt(req.query.userId);
  const searchQuery = req.query.q;
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    const userCommunities = await ChatMembers.findAll({
      where: { userId },
      include: [
        {
          model: Chats,
          where: { type: "community" },
          attributes: ["id", "name", "icon"],
          include: [
            {
              model: CommunityHashtags,
              include: [
                {
                  model: Hashtags,
                  where: {
                    hashtag: {
                      [Op.like]: `%${searchQuery}%`,
                    },
                  },
                  attributes: ["id", "hashtag", "usageCount"],
                },
              ],
            },
          ],
        },
      ],
    });

    const userCommunityHashtags = userCommunities.flatMap((member) =>
      member.Chat.CommunityHashtags.map((ch) => ({
        ...ch.Hashtag.toJSON(),
        isCommunityAssociated: true,
        community: {
          id: member.Chat.id,
          name: member.Chat.name,
          icon: member.Chat.icon,
        },
      }))
    );

    const otherHashtags = await Hashtags.findAll({
      where: {
        hashtag: {
          [Op.like]: `%${searchQuery}%`,
        },
        id: {
          [Op.notIn]: userCommunityHashtags.map((h) => h.id),
        },
      },
      attributes: ["id", "hashtag", "usageCount"],
      order: [["usageCount", "DESC"]],
    });

    const combinedResults = [
      ...userCommunityHashtags,
      ...otherHashtags.map((h) => ({
        ...h.toJSON(),
        isCommunityAssociated: false,
        community: null,
      })),
    ].sort((a, b) => {
      if (a.isCommunityAssociated !== b.isCommunityAssociated) {
        return a.isCommunityAssociated ? -1 : 1;
      }
      return b.usageCount - a.usageCount;
    });

    const paginatedResults = combinedResults.slice(offset, offset + limit);

    res.status(200).json({
      hashtags: paginatedResults,
      totalCount: combinedResults.length,
      page,
      totalPages: Math.ceil(combinedResults.length / limit),
    });
  } catch (error) {
    console.error("Error searching hashtags:", error);
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

const searchCommunities = async (req, res) => {
  const userId = parseInt(req.query.userId);
  const searchQuery = req.query.q;
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    const communities = await Chats.findAll({
      where: {
        name: {
          [Op.like]: `%${searchQuery}%`,
        },
        type: "community",
      },
      attributes: ["id", "name", "icon"],
      include: [
        {
          model: ChatMembers,
          where: { userId },
          required: true,
          attributes: [],
        },
      ],

      limit,
      offset,
    });

    res.status(200).json(communities);
  } catch (error) {
    console.error("Error searching communities:", error);
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
      attributes: ["id", "username", "profile_image"],
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
    const deletedMessages = await DeletedMessages.findAll({
      where: { userId },
      attributes: ["messageId"],
    });

    const deletedMessageIds = deletedMessages.map((dm) => dm.messageId);

    const userResults = await repositorySequelize.query(
      `SELECT id FROM Users WHERE username LIKE ?`,
      {
        replacements: [`%${searchString}%`],
        type: repositorySequelize.QueryTypes.SELECT,
      }
    );

    const userIds = userResults.map((user) => user.id);

    const chatResults = await skrollsSequelize.query(
      `SELECT DISTINCT chatId FROM ChatMembers WHERE userId IN (?)`,
      {
        replacements: [userIds],
        type: skrollsSequelize.QueryTypes.SELECT,
      }
    );

    const chatIds = chatResults.map((chat) => chat.chatId);

    const conversations = await Chats.findAll({
      include: [
        {
          model: ChatMembers,
          attributes: ["userId"],
        },
        {
          model: Messages,
          attributes: [
            "id",
            "chatId",
            "senderId",
            "content",
            "createdAt",
            "deleteForEveryone",
          ],
          where: {
            messageType: "regular",
            content: {
              [Op.like]: `%${searchString}%`,
            },
          },
          required: false,
        },
      ],
      where: {
        id: {
          [Op.in]: chatIds,
        },
      },
      order: [["updatedAt", "DESC"]],
    });

    const userPromises = Array.from(
      new Set(
        conversations.flatMap((convo) => [
          ...convo.ChatMembers.map((cm) => cm.userId),
          ...convo.Messages.map((msg) => msg.senderId),
        ])
      )
    ).map((id) =>
      repositorySequelize.query(
        `SELECT id, username, profilePhoto FROM Users WHERE id = ?`,
        {
          replacements: [id],
          type: repositorySequelize.QueryTypes.SELECT,
        }
      )
    );

    const userResultsAll = await Promise.all(userPromises);
    const userMap = new Map(
      userResultsAll.flat().map((user) => [user.id, user])
    );

    let relatedChats = [];
    let relatedMessages = [];

    conversations.forEach((conversation) => {
      const chatMembers = conversation.ChatMembers || [];
      const messages = conversation.Messages || [];

      const validMessages = messages.filter(
        (message) =>
          !message.deleteForEveryone && !deletedMessageIds.includes(message.id)
      );

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
              ? userMap.get(chatMembers[0].userId)?.username || "Unknown"
              : conversation.name,
          icon:
            conversation.type === "personal" && chatMembers.length > 0
              ? userMap.get(chatMembers[0].userId)?.profilePhoto || null
              : conversation.icon,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                senderId: lastMessage.senderId,
                senderUsername:
                  userMap.get(lastMessage.senderId)?.username || "Unknown",
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
                ? userMap.get(chatMembers[0].userId)?.username || "Unknown"
                : conversation.name,
            senderId: message.senderId,
            senderUsername:
              userMap.get(message.senderId)?.username || "Unknown",
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
  searchFeedHashtags,
  searchCommunities,
  searchMembers,
  searchConversations,
};
