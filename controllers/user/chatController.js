const { Sequelize, Op } = require("sequelize");
const { skrollsSequelize } = require("../../config/connection");
const Chats = require("../../models/chats");
const User = require("../../models/user");
const ChatMembers = require("../../models/chatmembers");
const DeletedChats = require("../../models/deletedchats");
const Messages = require("../../models/messages");

const iconUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ error: "No file uploades" });
  }

  res.status(200).json({
    fileName: req.file.filename,
  });
};

const mediaUpload = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send({ error: "No files uploaded" });
  }

  const fileNames = req.files.map((file) => file.filename);

  res.status(200).json({
    fileNames: fileNames,
  });
};

const recentChats = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await Chats.findAll({
      include: [
        {
          model: ChatMembers,
          attributes: ["userId"],
        },
        {
          model: DeletedChats,
          where: { userId },
          required: false,
        },
        {
          model: Messages,
          where: {
            messageType: "regular",
          },
          attributes: ["id", "createdAt"],
          order: [["createdAt", "DESC"]],
        },
      ],
      where: {
        id: {
          [Op.in]: Sequelize.literal(
            `(SELECT chatId FROM skrolls.ChatMembers WHERE userId = ${userId})`
          ),
        },
      },

      order: [["updatedAt", "DESC"]],
      limit: 5,
    });

    const userIds = new Set();
    conversations.forEach((convo) => {
      convo.ChatMembers.forEach((member) => userIds.add(member.userId));
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
          "profilePhoto",
        ],
      ],
    });

    const userMap = {};
    users.forEach((user) => {
      userMap[user.id] = user;
    });

    const recentChats = conversations.map((conversation) => {
      const otherMember = conversation.ChatMembers.find(
        (member) => member.userId !== userId
      );

      return {
        chatId: conversation.id,
        type: conversation.type,
        name:
          conversation.type === "personal"
            ? userMap[otherMember.userId]?.username || "Unknown User"
            : conversation.name,
        profilePhoto:
          conversation.type === "personal"
            ? userMap[otherMember.userId]?.profilePhoto || null
            : conversation.icon,
      };
    });

    res.status(200).json({ recentChats });
  } catch (error) {
    console.error("Error fetching recent chats:", error);
    res.status(500).json({ error: "Failed to fetch recent chats." });
  }
};

module.exports = {
  iconUpload,
  mediaUpload,
  recentChats,
};
