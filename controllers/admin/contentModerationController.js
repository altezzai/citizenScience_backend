const { Sequelize, Op } = require("sequelize");

const {
  repositorySequelize,
  skrollsSequelize,
} = require("../../config/connection");
const Reports = require("../../models/reports");
const Feed = require("../../models/feed");
const Comments = require("../../models/comments");
const Messages = require("../../models/messages");

const getPendingReports = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const { count, rows: reports } = await Reports.findAndCountAll({
      attributes: [
        "feedId",
        "commentId",
        "messageId",
        "userId",
        [Sequelize.fn("COUNT", Sequelize.col("Reports.id")), "reportCount"],

        [
          Sequelize.literal(`(
              SELECT username 
              FROM repository.Users 
              WHERE repository.Users.id = Reports.userId
            )`),
          "username",
        ],
        [
          Sequelize.literal(`(
              SELECT profile_image 
              FROM repository.Users 
              WHERE repository.Users.id = Reports.userId
            )`),
          "profilePhoto",
        ],
      ],
      where: {
        status: "pending",
      },

      group: ["feedId", "commentId", "messageId", "userId"],
      include: [
        {
          model: Feed,
          attributes: ["fileName", "description"],
          required: false,
        },
        {
          model: Comments,
          attributes: ["comment"],
          required: false,
        },
        {
          model: Messages,
          attributes: ["mediaUrl", "content"],
          required: false,
        },
      ],
      limit,
      offset,
      order: [[Sequelize.literal("reportCount"), "DESC"]],
    });

    const totalPages = Math.ceil(count.length / limit);

    res.status(200).json({
      totalReports: count.length,
      totalPages,
      currentPage: page,
      reports,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getRejectedReports = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const { count, rows: reports } = await Reports.findAndCountAll({
      attributes: [
        "feedId",
        "commentId",
        "messageId",
        "userId",
        [Sequelize.fn("COUNT", Sequelize.col("Reports.id")), "reportCount"],

        [
          Sequelize.literal(`(
                SELECT username 
                FROM repository.Users 
                WHERE repository.Users.id = Reports.userId
              )`),
          "username",
        ],
        [
          Sequelize.literal(`(
                SELECT profile_image 
                FROM repository.Users 
                WHERE repository.Users.id = Reports.userId
              )`),
          "profilePhoto",
        ],
      ],
      where: {
        status: "rejected",
      },

      group: ["feedId", "commentId", "messageId", "userId"],
      include: [
        {
          model: Feed,
          attributes: ["fileName", "description"],
          required: false,
        },
        {
          model: Comments,
          attributes: ["comment"],
          required: false,
        },
        {
          model: Messages,
          attributes: ["mediaUrl", "content"],
          required: false,
        },
      ],
      limit,
      offset,
      order: [[Sequelize.literal("reportCount"), "DESC"]],
    });

    const totalPages = Math.ceil(count.length / limit);

    res.status(200).json({
      totalReports: count.length,
      totalPages,
      currentPage: page,
      reports,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getResolvedReports = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const { count, rows: reports } = await Reports.findAndCountAll({
      attributes: [
        "feedId",
        "commentId",
        "messageId",
        "userId",
        [Sequelize.fn("COUNT", Sequelize.col("Reports.id")), "reportCount"],

        [
          Sequelize.literal(`(
                SELECT username 
                FROM repository.Users 
                WHERE repository.Users.id = Reports.userId
              )`),
          "username",
        ],
        [
          Sequelize.literal(`(
                SELECT profile_image 
                FROM repository.Users 
                WHERE repository.Users.id = Reports.userId
              )`),
          "profilePhoto",
        ],
      ],
      where: {
        status: "resolved",
      },

      group: ["feedId", "commentId", "messageId", "userId"],
      include: [
        {
          model: Feed,
          attributes: ["fileName", "description"],
          required: false,
        },
        {
          model: Comments,
          attributes: ["comment"],
          required: false,
        },
        {
          model: Messages,
          attributes: ["mediaUrl", "content"],
          required: false,
        },
      ],
      limit,
      offset,
      order: [[Sequelize.literal("reportCount"), "DESC"]],
    });

    const totalPages = Math.ceil(count.length / limit);

    res.status(200).json({
      totalReports: count.length,
      totalPages,
      currentPage: page,
      reports,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getPendingReports,
  getRejectedReports,
  getResolvedReports,
};
