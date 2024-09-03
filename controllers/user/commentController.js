const { Op, Sequelize } = require("sequelize");
const {
  repositorySequelize,
  skrollsSequelize,
} = require("../../config/connection");
const Feed = require("../../models/feed");
const User = require("../../models/user");
const Comments = require("../../models/comments");
const FeedMentions = require("../../models/feedmentions");
const Notifications = require("../../models/notifications");
const { addNotification } = require("./notificationController");

const addComment = async (req, res) => {
  const { feedId } = req.params;
  const { userId, comment, mentionIds, parentId } = req.body;
  const transaction = await skrollsSequelize.transaction();
  try {
    const parsedMentionIds = Array.isArray(mentionIds) ? mentionIds : null;

    const feed = await Feed.findByPk(feedId, { transaction });
    if (!feed) {
      throw new Error("Feed not found");
    }

    const newComment = await Comments.create(
      { feedId, userId, comment, parentId: parentId || null },
      { transaction }
    );
    if (parsedMentionIds && parsedMentionIds.length > 0) {
      const feedMentions = parsedMentionIds.map((index) => ({
        userId: index,
        commentId: newComment.id,
      }));
      await FeedMentions.bulkCreate(feedMentions, { transaction });
    }
    feed.commentCount += 1;
    await feed.save({ transaction });

    if (parentId) {
      const parentComment = await Comments.findByPk(parentId, { transaction });
      if (parentComment) {
        await addNotification(
          parentComment.userId,
          userId,
          "reply",
          "replied to your comment",
          feedId,
          newComment.id,
          `/feed/${feedId}`,
          "Medium",
          transaction
        );
      }
    } else {
      await addNotification(
        feed.userId,
        userId,
        "comment",
        "commented on your post",
        feedId,
        newComment.id,
        `/feed/${feedId}`,
        "Medium",
        transaction
      );
    }

    if (parsedMentionIds && parsedMentionIds.length > 0) {
      for (const mentionedUserId of parsedMentionIds) {
        await addNotification(
          mentionedUserId,
          userId,
          "mention",
          "mentioned you in a comment",
          feedId,
          newComment.id,
          `/feed/${feedId}`,
          "Medium",
          transaction
        );
      }
    }

    await transaction.commit();
    res.status(200).json(newComment);
  } catch (error) {
    await transaction.rollback();
    console.error("error adding comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getComments = async (req, res) => {
  const { feedId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const offset = (page - 1) * limit;

  try {
    const comments = await Comments.findAll({
      offset,
      limit,
      where: { feedId, parentId: null },
      order: [["createdAt", "DESC"]],
      attributes: {
        include: [
          [
            skrollsSequelize.literal(`(
                SELECT COUNT(*)
                FROM Comments AS Replies
                WHERE Replies.parentId = Comments.id
              )`),
            "replyCount",
          ],
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
              SELECT profilePhoto
              FROM repository.Users AS users
              WHERE users.id = Comments.userId
            )`),
            "profilePhoto",
          ],
        ],
      },
      include: [
        {
          model: FeedMentions,
          attributes: [
            "userId",
            [
              Sequelize.literal(`(
                  SELECT username from repository.Users AS users WHERE users.id = FeedMentions.userId)`),
              "username",
            ],
            [
              Sequelize.literal(`(
                  SELECT profilePhoto
                  FROM repository.Users AS users
                  WHERE users.id = FeedMentions.userId
                )`),
              "profilePhoto",
            ],
          ],
          order: [["createdAt", "ASC"]],
        },
      ],
    });

    res.status(200).json(comments);
  } catch (error) {
    console.error("Error retrieving comments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getReplies = async (req, res) => {
  const { feedId, commentId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const offset = (page - 1) * limit;

  try {
    const comments = await Comments.findAll({
      offset,
      limit,
      where: { feedId, parentId: commentId },
      order: [["createdAt", "DESC"]],
      attributes: {
        include: [
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
              SELECT profilePhoto
              FROM repository.Users AS users
              WHERE users.id = Comments.userId
            )`),
            "profilePhoto",
          ],
        ],
      },

      include: [
        {
          model: FeedMentions,
          attributes: [
            "userId",
            [
              Sequelize.literal(`(
                  SELECT username from repository.Users AS users WHERE users.id = FeedMentions.userId)`),
              "username",
            ],
            [
              Sequelize.literal(`(
                  SELECT profilePhoto
                  FROM repository.Users AS users
                  WHERE users.id = FeedMentions.userId
                )`),
              "profilePhoto",
            ],
          ],
          order: [["createdAt", "ASC"]],
        },
      ],
    });

    res.status(200).json(comments);
  } catch (error) {
    console.error("Error retrieving comments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateComment = async (req, res) => {
  const { commentId } = req.params;
  const { comment, mentionIds } = req.body;

  const transaction = await skrollsSequelize.transaction();

  try {
    const commentInstance = await Comments.findByPk(commentId, { transaction });

    const updatedComment = await Comments.update(
      { comment },
      { where: { id: commentId }, transaction }
    );
    if (!updatedComment) {
      await transaction, rollback();
      res.status(404).json({ error: "Comment not updated" });
    }

    if (mentionIds && Array.isArray(mentionIds)) {
      const existingMentions = await FeedMentions.findAll({
        where: { commentId },
        transaction,
      });

      const existingMentionIds = existingMentions.map(
        (mention) => mention.userId
      );
      const mentionsToRemove = existingMentionIds.filter(
        (id) => !mentionIds.includes(id)
      );
      const mentionsToAdd = mentionIds.filter(
        (id) => !existingMentionIds.includes(id)
      );

      if (mentionsToRemove.length > 0) {
        await FeedMentions.destroy({
          where: {
            commentId,
            userId: mentionsToRemove,
          },
          transaction,
        });

        await Notifications.destroy({
          where: {
            userId: mentionsToRemove,
            type: "mention",
            commentId,
          },
          transaction,
        });
      }

      if (mentionsToAdd.length > 0) {
        const newFeedMentions = mentionsToAdd.map((userId) => ({
          userId,
          commentId,
        }));
        await FeedMentions.bulkCreate(newFeedMentions, { transaction });

        for (const mentionedUserId of mentionsToAdd) {
          await addNotification(
            mentionedUserId,
            commentInstance.userId,
            "mention",
            "mentioned you in a comment",
            commentInstance.feedId,
            commentId,
            `/feed/${commentInstance.feedId}`,
            "Medium",
            transaction
          );
        }
      }
    }
    await transaction.commit();

    const commentI = await Comments.findByPk(commentId);
    res.status(200).json(commentI);
  } catch (error) {
    await transaction.rollback();
    console.error("Error Updating comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteComment = async (req, res) => {
  const { commentId } = req.params;

  try {
    const deletedComment = await Comments.destroy({ where: { id: commentId } });

    if (deletedComment) {
      res.status(200).json({ message: "Deleted Comment successfully" });
    } else {
      res.status(404).json({ error: "Comment not found" });
    }
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  addComment,
  getComments,
  getReplies,
  updateComment,
  deleteComment,
};
