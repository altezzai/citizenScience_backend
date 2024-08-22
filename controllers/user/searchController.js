const { Op, Sequelize } = require("sequelize");
const sequelize = require("../../config/connection");
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
    const followingMatches = await Followers.findAll({
      where: {
        followerId: userId,
      },
      include: [
        {
          model: User,
          as: "FollowingDetails",
          where: {
            username: { [Op.like]: `%${searchQuery}%` },
          },
          attributes: ["id"],
        },
      ],
    });

    const followingIds = followingMatches.map((f) => f.followingId);

    const followerMatches = await Followers.findAll({
      where: {
        followingId: userId,
      },
      include: [
        {
          model: User,
          as: "FollowerDetails",
          where: {
            username: { [Op.like]: `%${searchQuery}%` },
          },
          attributes: ["id"],
        },
      ],
    });

    const followerIds = followerMatches.map((f) => f.followerId);

    const otherMatches = await User.findAll({
      where: {
        username: { [Op.like]: `%${searchQuery}%` },
        id: {
          [Op.notIn]: [...followingIds, ...followerIds, userId],
        },
      },
      attributes: ["id"],
    });

    const otherIds = otherMatches.map((u) => u.id);

    const orderedIds = [...followingIds, ...followerIds, ...otherIds];

    const users = await User.findAll({
      where: {
        id: {
          [Op.in]: orderedIds,
        },
      },
      attributes: ["id", "username", "profilePhoto"],
      order: [sequelize.literal(`FIELD(id, ${orderedIds.join(",")})`)],
      limit,
      offset,
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
          include: [
            {
              model: User,
              attributes: ["id", "username", "profilePhoto"],
            },
          ],
        },
        {
          model: Messages,
          include: [
            {
              model: User,
              as: "sender",
              attributes: ["id", "username", "profilePhoto"],
            },
          ],
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
            "$ChatMembers.User.username$": {
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
              ? chatMembers[0].User.username
              : conversation.name,
          icon:
            conversation.type === "personal" && chatMembers.length > 0
              ? chatMembers[0].User.profilePhoto
              : conversation.icon,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                senderId: lastMessage.senderId,
                senderUsername: lastMessage.sender
                  ? lastMessage.sender.username
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
                ? chatMembers[0].User.username
                : conversation.name,
            senderId: message.senderId,
            senderUsername: message.sender ? message.sender.username : null,
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
