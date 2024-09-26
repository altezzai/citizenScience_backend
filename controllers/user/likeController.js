const { Op, Sequelize } = require("sequelize");
const {
  repositorySequelize,
  skrollsSequelize,
} = require("../../config/connection");
const Feed = require("../../models/feed");
const Like = require("../../models/like");
const User = require("../../models/user");
const Comments = require("../../models/comments");
const Notifications = require("../../models/notifications");

const addLike = async (req, res) => {
  const { feedIds = [], commentIds = [] } = req.body;

  if (
    (!feedIds || !Array.isArray(feedIds) || feedIds.length === 0) &&
    (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0)
  ) {
    return res.status(400).json({
      error: "At least one of 'feedIds'or 'commentIds' is required.",
    });
  }
  const transaction = await skrollsSequelize.transaction();

  try {
    const userId = req.user.id;
    // const user = await User.findOne({
    //   where: { id: userId },
    //   attributes: ["isBanned"],
    // });

    // if (user.isBanned) {
    //   return res.status(403).json({ error: "User account is banned" });
    // }
    const existingFeeds = await Feed.findAll({
      where: {
        id: {
          [Op.in]: feedIds,
        },
        feedActive: true,
      },
      transaction,
    });

    const existingComments = await Comments.findAll({
      where: {
        id: {
          [Op.in]: commentIds,
        },
        commentActive: true,
      },
      transaction,
    });

    const existingFeedIds = existingFeeds.map((feed) => feed.id);
    const existingCommentIds = existingComments.map((comment) => comment.id);

    const invalidFeedIds = feedIds.filter(
      (id) => !existingFeedIds.includes(id)
    );
    const invalidCommentIds = commentIds.filter(
      (id) => !existingCommentIds.includes(id)
    );

    const actions = [];

    for (const feedId of existingFeedIds) {
      const target = existingFeeds.find((feed) => feed.id === feedId);

      const existingLike = await Like.findOne({
        where: { userId, feedId },
        transaction,
      });

      if (existingLike) {
        await Like.destroy({ where: { userId, feedId }, transaction });
        target.likeCount -= 1;
        await Notifications.destroy({
          where: {
            userId: target.userId,
            actorId: userId,
            type: "like",
            feedId,
          },
          transaction,
        });
        actions.push(`Like removed from feed ${feedId}`);
      } else {
        await Like.create({ userId, feedId }, { transaction });
        target.likeCount += 1;
        await Notifications.create(
          {
            userId: target.userId,
            actorId: userId,
            type: "like",
            content: "liked your feed",
            feedId,
            actionURL: `/feed/${feedId}`,
            priority: "low",
          },
          { transaction }
        );
        actions.push(`Like added to feed ${feedId}`);
      }

      await target.save({ transaction });
    }

    for (const commentId of existingCommentIds) {
      const target = existingComments.find(
        (comment) => comment.id === commentId
      );

      const existingLike = await Like.findOne({
        where: { userId, commentId },
        transaction,
      });

      if (existingLike) {
        await Like.destroy({ where: { userId, commentId }, transaction });
        target.likeCount -= 1;
        await Notifications.destroy({
          where: {
            userId: target.userId,
            actorId: userId,
            type: "like",
            commentId,
          },
          transaction,
        });
        actions.push(`Like removed from comment ${commentId}`);
      } else {
        await Like.create({ userId, commentId }, { transaction });
        target.likeCount += 1;
        await Notifications.create(
          {
            userId: target.userId,
            actorId: userId,
            type: "like",
            content: "liked your comment",
            commentId,
            actionURL: `/feed/${target.feedId}`,
            priority: "low",
          },
          { transaction }
        );
        actions.push(`Like added to comment ${commentId}`);
      }

      await target.save({ transaction });
    }

    await transaction.commit();

    res.status(200).json({
      message: "Operation completed.",
      actions,
      invalidFeedIds: invalidFeedIds.length ? invalidFeedIds : undefined,
      invalidCommentIds: invalidCommentIds.length
        ? invalidCommentIds
        : undefined,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error adding like:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getFeedLikes = async (req, res) => {
  const { feedId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const offset = (page - 1) * limit;

  try {
    const userId = req.user.id;

    const feedLikes = await Like.findAll({
      offset,
      limit,
      where: {
        feedId,
      },
      attributes: [
        "userId",
        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN 'skrolls.user'
                ELSE username
              END
            FROM repository.Users
            WHERE repository.Users.id = Like.userId
          )`),
          "username",
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN 'skrolls.user'
                ELSE first_name
              END
            FROM repository.Users
            WHERE repository.Users.id = Like.userId
          )`),
          "first_name",
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN 'skrolls.user'
                ELSE middle_name
              END
            FROM repository.Users
            WHERE repository.Users.id = Like.userId
          )`),
          "middle_name",
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN 'skrolls.user'
                ELSE last_name
              END
            FROM repository.Users
            WHERE repository.Users.id = Like.userId
          )`),
          "last_name",
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
            WHERE repository.Users.id = Like.userId
          )`),
          "profilePhoto",
        ],

        [
          Sequelize.literal(`(
            SELECT COUNT(*)
            FROM skrolls.Followers AS followers
            WHERE followers.followerId = ${userId}
            AND followers.followingId = Like.userId
          ) > 0`),
          "isFollowing",
        ],
        [
          Sequelize.literal(`(
            SELECT COUNT(*)
            FROM skrolls.Followers AS followers
            WHERE followers.followerId = Like.userId
            AND followers.followingId = ${userId}
          ) > 0`),
          "isFollower",
        ],
      ],
    });

    res.status(200).json(feedLikes);
  } catch (error) {
    console.error("Error retrieving likes", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const getCommentLikes = async (req, res) => {
  const { commentId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const offset = (page - 1) * limit;

  try {
    const userId = req.user.id;

    const feedLikes = await Like.findAll({
      offset,
      limit,
      where: {
        commentId,
      },
      attributes: [
        "userId",
        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN 'skrolls.user'
                ELSE username
              END
            FROM repository.Users
            WHERE repository.Users.id = Like.userId
          )`),
          "username",
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN 'skrolls.user'
                ELSE first_name
              END
            FROM repository.Users
            WHERE repository.Users.id = Like.userId
          )`),
          "first_name",
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN 'skrolls.user'
                ELSE middle_name
              END
            FROM repository.Users
            WHERE repository.Users.id = Like.userId
          )`),
          "middle_name",
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN 'skrolls.user'
                ELSE last_name
              END
            FROM repository.Users
            WHERE repository.Users.id = Like.userId
          )`),
          "last_name",
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
            WHERE repository.Users.id = Like.userId
          )`),
          "profilePhoto",
        ],
        [
          Sequelize.literal(`(
            SELECT COUNT(*)
            FROM skrolls.Followers AS followers
            WHERE followers.followerId = ${userId}
            AND followers.followingId = Like.userId
          ) > 0`),
          "isFollowing",
        ],
        [
          Sequelize.literal(`(
            SELECT COUNT(*)
            FROM skrolls.Followers AS followers
            WHERE followers.followerId = Like.userId
            AND followers.followingId = ${userId}
          ) > 0`),
          "isFollower",
        ],
      ],
    });

    res.status(200).json(feedLikes);
  } catch (error) {
    console.error("Error retrieving likes", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  addLike,
  getFeedLikes,
  getCommentLikes,
};
