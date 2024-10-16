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
const DeletedChats = require("../../models/deletedchats");
const BlockedChats = require("../../models/blockedchats");

const searchUsers = async (req, res) => {
  const userId = req.user.id;
  const searchQuery = req.query.q.toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    if (!searchQuery || searchQuery.trim() === "") {
      return res.status(400).json({ error: "Search query is required" });
    }
    const matchingUsers = await User.findAll({
      where: {
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("User.username")),
            {
              [Op.like]: `%${searchQuery}%`,
            }
          ),
        ],
        id: { [Op.not]: userId },
        isActive: true,
        citizenActive: true,
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
      where: {
        id: { [Op.in]: orderedIds },
        isActive: true,
        citizenActive: true,
      },
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
  const userId = req.user.id;
  const searchQuery = req.query.q.toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    if (!searchQuery || searchQuery.trim() === "") {
      return res.status(400).json({ error: "Search query is required" });
    }
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
                  where: Sequelize.where(
                    Sequelize.fn(
                      "LOWER",
                      Sequelize.col("Chat->CommunityHashtags->Hashtag.hashtag")
                    ),
                    {
                      [Op.like]: `%${searchQuery}%`,
                    }
                  ),
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
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("Hashtags.hashtag")),
            {
              [Op.like]: `%${searchQuery}%`,
            }
          ),
          {
            id: {
              [Op.notIn]: userCommunityHashtags.map((h) => h.id),
            },
          },
        ],
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
  const searchQuery = req.query.q.toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    if (!searchQuery || searchQuery.trim() === "") {
      return res.status(400).json({ error: "Search query is required" });
    }
    const hashtags = await Hashtags.findAll({
      where: Sequelize.where(
        Sequelize.fn("LOWER", Sequelize.col("Hashtags.hashtag")),
        {
          [Op.like]: `%${searchQuery}%`,
        }
      ),
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
  const userId = req.user.id;
  const searchQuery = req.query.q.toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    if (!searchQuery || searchQuery.trim() === "") {
      return res.status(400).json({ error: "Search query is required" });
    }
    const communities = await Chats.findAll({
      where: {
        [Op.and]: [
          Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("Chats.name")), {
            [Op.like]: `%${searchQuery}%`,
          }),
          {
            type: "community",
          },
        ],
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
  const chatId = parseInt(req.query.chatId);
  const userId = req.user.id;
  const searchItem = req.query.q.toLowerCase();

  try {
    if (!searchItem || searchItem.trim() === "") {
      return res.status(400).json({ error: "Search query is required" });
    }
    const followers = await Followers.findAll({
      where: {
        followerId: userId,
      },
      attributes: ["followingId"],
    });

    const followerIds = followers.map((follower) => follower.followingId);

    const followings = await Followers.findAll({
      where: {
        followingId: userId,
      },
      attributes: ["followerId"],
    });

    const followingIds = followings.map((following) => following.followerId);

    const uniqueIds = [...new Set([...followerIds, ...followingIds])];

    const users = await User.findAll({
      where: {
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("User.username")),
            {
              [Op.like]: `%${searchItem}%`,
            }
          ),
          {
            id: {
              [Op.in]: uniqueIds,
            },
            isActive: true,
            citizenActive: true,
          },
        ],
      },

      attributes: ["id", "username", "profile_image"],
    });

    const blockedUsers = await BlockedChats.findAll({
      where: { blockedBy: userId },
      attributes: ["blockedUser"],
    });

    const blockedByUserIds = blockedUsers.map((blocked) => blocked.blockedUser);

    let filteredUsers;

    if (chatId) {
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

      filteredUsers = users.filter((user) => !chatMemberIds.includes(user.id));
    } else {
      filteredUsers = users;
    }

    const usersWithBlockStatus = filteredUsers.map((user) => ({
      ...user.toJSON(),
      blockedByUser: blockedByUserIds.includes(user.id),
    }));

    res.status(200).json(usersWithBlockStatus);
  } catch (error) {
    console.error("Error in searching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const searchConversations = async (req, res) => {
  const userId = req.user.id;
  const searchString = req.query.q.toLowerCase();
  const isCommunity = req.query.isCommunity === "true" || false;

  try {
    if (!searchString || searchString.trim() === "") {
      return res.status(400).json({ error: "Search query is required" });
    }

    const deletedMessages = await DeletedMessages.findAll({
      where: { userId },
      attributes: ["messageId"],
    });
    const deletedMessageIds = deletedMessages.map((dm) => dm.messageId);

    const deletedChats = await DeletedChats.findAll({
      where: { userId },
      attributes: ["chatId", "deletedAt"],
    });
    const deletedChatMap = new Map(
      deletedChats.map((dc) => [dc.chatId, dc.deletedAt])
    );

    const userChats = await ChatMembers.findAll({
      where: { userId },
      attributes: ["chatId"],
    });
    const userChatIds = userChats.map((uc) => uc.chatId);

    const conversations = await Chats.findAll({
      limit: 100,
      include: [
        {
          model: ChatMembers,
          attributes: ["userId"],
        },
        {
          model: Messages,
          where: {
            messageType: "regular",
            messageActive: true,
            id: {
              [Op.notIn]: deletedMessageIds,
            },
            deleteForEveryone: false,
            [Op.and]: [
              Sequelize.where(
                Sequelize.fn("LOWER", Sequelize.col("Messages.content")),
                {
                  [Op.like]: `%${searchString}%`,
                }
              ),
            ],
          },
          order: [["createdAt", "DESC"]],
          required: false,
        },
      ],
      where: {
        id: {
          [Op.in]: userChatIds,
        },
        type: isCommunity
          ? "community"
          : {
              [Op.in]: ["group", "personal"],
            },
      },
      order: [["createdAt", "DESC"]],
    });

    const lastMessages = await Messages.findAll({
      where: {
        chatId: {
          [Op.in]: conversations.map((c) => c.id),
        },
        messageType: "regular",
        messageActive: true,
        id: {
          [Op.notIn]: deletedMessageIds,
        },
        deleteForEveryone: false,
      },
      order: [["createdAt", "ASC"]],
    });

    const lastMessageMap = new Map(lastMessages.map((m) => [m.chatId, m]));

    const userIds = new Set();
    conversations.forEach((convo) => {
      convo.ChatMembers.forEach((member) => userIds.add(member.userId));
      convo.Messages.forEach((message) => userIds.add(message.senderId));
    });

    const users = await User.findAll({
      where: {
        id: Array.from(userIds),
      },
      attributes: [
        "id",
        [
          Sequelize.literal(`CASE
            WHEN (isActive = false OR citizenActive = false)
            THEN 'skrolls.user'
            ELSE username
          END`),
          "username",
        ],
        [
          Sequelize.literal(`CASE
            WHEN (isActive = false OR citizenActive = false)
            THEN NULL
            ELSE profile_image
          END`),
          "profile_image",
        ],
      ],
      raw: true,
    });

    const userMap = new Map(users.map((user) => [user.id, user]));

    let relatedChats = [];
    let relatedMessages = [];

    conversations.forEach((conversation) => {
      const deletedChatDate =
        deletedChatMap.get(conversation.id) || new Date(0);
      const otherMember = conversation.ChatMembers.find(
        (member) => member.userId !== userId
      );
      const otherUser = userMap.get(otherMember?.userId);

      const chatName =
        conversation.type === "personal"
          ? otherUser?.username || "Unknown User"
          : conversation.name;

      const chatIcon =
        conversation.type === "personal"
          ? otherUser?.profile_image || null
          : conversation.icon;

      const chatMatches = chatName
        .toLowerCase()
        .includes(searchString.toLowerCase());

      if (chatMatches) {
        const lastMessage = lastMessageMap.get(conversation.id);

        relatedChats.push({
          chatId: conversation.id,
          type: conversation.type,
          name: chatName,
          icon: chatIcon,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                senderId: lastMessage.senderId,
                senderUsername:
                  userMap.get(lastMessage.senderId)?.username || "Unknown User",
                status:
                  lastMessage.senderId === userId
                    ? lastMessage.overallStatus
                    : null,
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadMessagesCount: 0,
        });
      }

      conversation.Messages.forEach((message) => {
        if (
          new Date(message.createdAt) > deletedChatDate &&
          message.content.toLowerCase().includes(searchString)
        ) {
          relatedMessages.push({
            id: message.id,
            content: message.content,
            chatId: conversation.id,
            chatName: chatName,
            senderId: message.senderId,
            senderUsername:
              userMap.get(message.senderId)?.username || "Unknown User",
            status: message.senderId === userId ? message.overallStatus : null,
            createdAt: message.createdAt,
          });
        }
      });
    });

    relatedChats = await Promise.all(
      relatedChats.map(async (chat) => {
        if (chat.lastMessage) {
          const unreadMessagesCount = await MessageStatuses.count({
            include: [
              {
                model: Messages,
                attributes: [],
                where: {
                  chatId: chat.chatId,

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
            ...chat,
            unreadMessagesCount,
          };
        }
        return chat;
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
