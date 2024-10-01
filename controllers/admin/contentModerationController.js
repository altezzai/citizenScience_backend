const { Sequelize, Op } = require("sequelize");

const {
  repositorySequelize,
  skrollsSequelize,
} = require("../../config/connection");
const Reports = require("../../models/reports");
const Feed = require("../../models/feed");
const Comments = require("../../models/comments");
const Messages = require("../../models/messages");
const User = require("../../models/user");

const getReports = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const status = req.query.status;

  try {
    const whereCondition = {
      status: status,
    };
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
        ...whereCondition,
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

const viewReport = async (req, res) => {
  const { feedId, userId, commentId, messageId } = req.body;
  const status = req.query.status;

  const ids = [feedId, userId, commentId, messageId].filter(Boolean);

  if (ids.length !== 1) {
    return res.status(400).json({
      error:
        "Only one of feedId, userId, commentId, or messageId should be provided.",
    });
  }

  try {
    let result;

    const whereCondition = {
      status: status,
    };

    if (feedId) {
      whereCondition.feedId = feedId;
      result = await Feed.findByPk(feedId, {
        attributes: [
          "id",
          "fileName",
          "description",
          "link",
          "simplified_description",
          "showSimplified",
          [
            Sequelize.literal(`(
                  SELECT username
                  FROM repository.Users AS users
                  WHERE users.id = Feed.userId
                )`),
            "username",
          ],
          [
            Sequelize.literal(`(
                  SELECT profile_image
                  FROM repository.Users AS users
                  WHERE users.id = Feed.userId
                )`),
            "profilePhoto",
          ],
          [
            Sequelize.literal(`(
                  SELECT isActive
                  FROM repository.Users AS users
                  WHERE users.id = Feed.userId
                )`),
            "isActive",
          ],
          [
            Sequelize.literal(`(
                  SELECT citizenActive
                  FROM repository.Users AS users
                  WHERE users.id = Feed.userId
                )`),
            "citizenActive",
          ],
        ],
      });
    } else if (commentId) {
      whereCondition.commentId = commentId;
      result = await Comments.findByPk(commentId, {
        attributes: [
          "id",
          "comment",
          [
            Sequelize.literal(`(
                  SELECT username
                  FROM repository.Users AS users
                  WHERE users.id = Comments.userId
                )`),
            "username",
          ],
          [
            Sequelize.literal(`(
                  SELECT profile_image
                  FROM repository.Users AS users
                  WHERE users.id = Comments.userId
                )`),
            "profilePhoto",
          ],
          [
            Sequelize.literal(`(
                  SELECT isActive
                  FROM repository.Users AS users
                  WHERE users.id = Comments.userId
                )`),
            "isActive",
          ],
          [
            Sequelize.literal(`(
                  SELECT citizenActive
                  FROM repository.Users AS users
                  WHERE users.id = Comments.userId
                )`),
            "citizenActive",
          ],
        ],

        include: [
          {
            model: Feed,
            attributes: [
              "id",
              "fileName",
              "description",
              "link",
              "simplified_description",
              "showSimplified",
              [
                Sequelize.literal(`(
                      SELECT username
                      FROM repository.Users AS users
                      WHERE users.id = Feed.userId
                    )`),
                "username",
              ],
              [
                Sequelize.literal(`(
                      SELECT profile_image
                      FROM repository.Users AS users
                      WHERE users.id = Feed.userId
                    )`),
                "profilePhoto",
              ],
              [
                Sequelize.literal(`(
                      SELECT isActive
                      FROM repository.Users AS users
                      WHERE users.id = Feed.userId
                    )`),
                "isActive",
              ],
              [
                Sequelize.literal(`(
                      SELECT citizenActive
                      FROM repository.Users AS users
                      WHERE users.id = Feed.userId
                    )`),
                "citizenActive",
              ],
            ],
          },
          {
            model: Comments,
            as: "ParentComment",
            attributes: [
              "id",
              "comment",
              [
                Sequelize.literal(`(
                      SELECT username
                      FROM repository.Users AS users
                      WHERE users.id = ParentComment.userId
                    )`),
                "parentUsername",
              ],
              [
                Sequelize.literal(`(
                      SELECT profile_image
                      FROM repository.Users AS users
                      WHERE users.id = ParentComment.userId
                    )`),
                "parentProfilePhoto",
              ],
              [
                Sequelize.literal(`(
                      SELECT isActive
                      FROM repository.Users AS users
                      WHERE users.id = ParentComment.userId
                    )`),
                "parentIsActive",
              ],
              [
                Sequelize.literal(`(
                      SELECT citizenActive
                      FROM repository.Users AS users
                      WHERE users.id = ParentComment.userId
                    )`),
                "parentCitizenActive",
              ],
            ],
          },
        ],
      });
    } else if (userId) {
      whereCondition.userId = userId;
      result = await User.findByPk(userId, {
        attributes: [
          "id",
          "username",
          "first_name",
          "last_name",
          "profile_image",
          "isActive",
          "citizenActive",
        ],
      });
    } else if (messageId) {
      whereCondition.messageId = messageId;
      result = await Messages.findByPk(messageId, {
        attributes: [
          "id",
          "mediaUrl",
          "content",
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
                SELECT profile_image
                FROM repository.Users AS users
                WHERE users.id = Messages.senderId
              )`),
            "profilePhoto",
          ],
          [
            Sequelize.literal(`(
                SELECT isActive
                FROM repository.Users AS users
                WHERE users.id = Messages.senderId
              )`),
            "isActive",
          ],
          [
            Sequelize.literal(`(
                SELECT citizenActive
                FROM repository.Users AS users
                WHERE users.id = Messages.senderId
              )`),
            "citizenActive",
          ],
        ],
      });
    }

    const reports = await Reports.findAll({
      attributes: [
        "reason",
        [Sequelize.fn("COUNT", Sequelize.col("Reports.id")), "reasonCount"],
      ],
      where: {
        ...whereCondition,
      },
      group: ["reason"],

      order: [[Sequelize.literal("reasonCount"), "DESC"]],
    });
    res.status(200).json({
      result,

      reports,
    });
  } catch (error) {
    console.error("Error viewing report:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getReports,
  viewReport,
};
