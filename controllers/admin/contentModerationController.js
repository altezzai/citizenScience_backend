const { Sequelize, Op, where } = require("sequelize");

const {
  repositorySequelize,
  skrollsSequelize,
} = require("../../config/connection");
const Reports = require("../../models/reports");
const Feed = require("../../models/feed");
const Comments = require("../../models/comments");
const Messages = require("../../models/messages");
const User = require("../../models/user");
const Actions = require("../../models/actions");
const ReportActions = require("../../models/reportactions");
const { addNotification } = require("../user/notificationController");

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
            FROM repository.Users AS users
            WHERE users.id = Reports.userId
            AND users.isActive = true
            AND users.citizenActive = true
          )`),
          "username",
        ],
        [
          Sequelize.literal(`(
            SELECT profile_image
            FROM repository.Users AS users
            WHERE users.id = Reports.userId
            AND users.isActive = true
            AND users.citizenActive = true
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
          where: { isDeleted: false },
          attributes: ["fileName", "description"],
          required: false,
        },
        {
          model: Comments,
          where: { isDeleted: false },
          attributes: ["comment"],
          required: false,
        },
        {
          model: Messages,
          where: { deleteForEveryone: false },
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

    let whereCondition = {};

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
          "userId",
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
          "userId",
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
              "userId",
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
          "senderId",
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
        status,
      },
      group: ["reason"],

      order: [[Sequelize.literal("reasonCount"), "DESC"]],
    });

    const actions = await Actions.findAll({
      attributes: ["action_types", "suspension_duration"],
      where: {
        ...whereCondition,
      },
    });
    res.status(200).json({
      result,
      reports,
      actions,
    });
  } catch (error) {
    console.error("Error viewing report:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const addAction = async (req, res) => {
  const { feedId, userId, commentId, messageId, action_types, ban_duration } =
    req.body;

  const ids = [feedId, userId, commentId, messageId].filter(Boolean);

  if (ids.length !== 1) {
    return res.status(400).json({
      error:
        "Only one of feedId, userId, commentId, or messageId should be provided.",
    });
  }

  if (!action_types) {
    return res.status(400).json({
      error: "action_types is a required field.",
    });
  }

  if (action_types === "account_suspension" && !ban_duration) {
    return res.status(400).json({
      error:
        "ban_duration is required when the action_types is 'account_suspension'.",
    });
  }

  if (action_types === "content_removal" && userId) {
    return res.status(400).json({
      error: "userId is not a content",
    });
  }

  const skrollsTransaction = await skrollsSequelize.transaction();
  const repositoryTransaction = await repositorySequelize.transaction();

  try {
    const reviewedBy = req.user.id;
    const whereClause = {};
    if (userId) whereClause.userId = userId;
    if (feedId) whereClause.feedId = feedId;
    if (commentId) whereClause.commentId = commentId;
    if (messageId) whereClause.messageId = messageId;

    const [action, created] = await Actions.upsert(
      {
        ...whereClause,
        action_types,
        reviewedBy,
        resolvedAt: new Date(),
        suspension_duration: ban_duration ? ban_duration : null,
      },
      {
        returning: true,
        where: whereClause,
        transaction: skrollsTransaction,
      }
    );

    const relatedReports = await Reports.findAll({
      where: whereClause,
      transaction: skrollsTransaction,
    });

    await Reports.update(
      { status: "resolved" },
      {
        where: whereClause,
        transaction: skrollsTransaction,
      }
    );

    await Promise.all(
      relatedReports.map((report) =>
        ReportActions.upsert(
          {
            actionId: action.id,
            reportId: report.id,
          },
          {
            transaction: skrollsTransaction,
            where: { reportId: report.id },
          }
        )
      )
    );

    if (action_types === "account_suspension") {
      if (userId) {
        await User.update(
          { isBanned: true, bannedAt: new Date(), ban_duration },
          {
            where: {
              id: userId,
            },
            transaction: repositoryTransaction,
          }
        );
      } else if (feedId) {
        const feed = await Feed.findByPk(feedId, {
          attributes: ["userId"],
          transaction: skrollsTransaction,
        });
        await User.update(
          { isBanned: true, bannedAt: new Date(), ban_duration },
          {
            where: {
              id: feed.userId,
            },
            transaction: repositoryTransaction,
          }
        );
      } else if (commentId) {
        const comment = await Comments.findByPk(commentId, {
          attributes: ["userId"],
          transaction: skrollsTransaction,
        });
        await User.update(
          { isBanned: true, bannedAt: new Date(), ban_duration },
          {
            where: {
              id: comment.userId,
            },
            transaction: repositoryTransaction,
          }
        );
      } else if (messageId) {
        const message = await Messages.findByPk(messageId, {
          attributes: ["senderId"],
          transaction: skrollsTransaction,
        });
        await User.update(
          { isBanned: true, bannedAt: new Date(), ban_duration },
          {
            where: {
              id: message.senderId,
            },
            transaction: repositoryTransaction,
          }
        );
      }
    }

    if (action_types === "content_removal") {
      if (feedId) {
        await Feed.update(
          { feedActive: false },
          {
            where: { feedId },
            transaction: skrollsTransaction,
          }
        );
      } else if (commentId) {
        await Comments.update(
          { commentActive: false },
          {
            where: { commentId },
            transaction: skrollsTransaction,
          }
        );
      } else if (messageId) {
        await Messages.update(
          { messageActive: false },
          {
            where: { messageId },
            transaction: skrollsTransaction,
          }
        );
      }
    }

    await skrollsTransaction.commit();
    await repositoryTransaction.commit();

    res.status(created ? 201 : 200).json({
      message: created
        ? "Action created successfully"
        : "Action updated successfully",
      action,
      updatedReportsCount: relatedReports.length,
    });
  } catch (error) {
    await skrollsTransaction.rollback();
    await repositoryTransaction.rollback();
    console.error("Error in addAction:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getReports,
  viewReport,
  addAction,
};
