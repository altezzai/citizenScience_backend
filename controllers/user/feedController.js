const { where } = require("sequelize");
const sequelize = require("../../config/connection");
const Feed = require("../../models/feed");
const Like = require("../../models/like");
const User = require("../../models/user");
const Comments = require("../../models/comments");

async function addFeed(req, res) {
  const { fileName, link, description, userId } = req.body;

  try {
    const newFeed = await Feed.create({
      fileName,
      link,
      description,
      userId,
    });
    res.status(201).json(newFeed);
  } catch (error) {
    console.error("Error creating feed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

const getFeeds = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const feeds = await Feed.findAll({
      offset,
      limit,
      order: [["createdAt", "DESC"]],
      include: User,
    });
    res.status(200).json(feeds);
  } catch (error) {
    console.error("Error fetching feeds:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getFeed = async (req, res) => {
  const { feedId } = req.params;

  try {
    const feed = await Feed.findByPk(feedId, {
      include: [User, Like, Comments],
    });
    if (!feed) {
      return res.status(404).json({ message: "Feed not found" });
    }
    res.status(200).json(feed);
  } catch (error) {
    console.error("Error fetching feed:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateFeed = async (req, res) => {
  const { id } = req.params;
  const { link, description, likeCount, commentCount, shareCount } = req.body;

  try {
    const [updated] = await Feed.update(
      { link, description, likeCount, commentCount, shareCount },
      { where: { id } }
    );
    if (updated) {
      const updateFeed = await Feed.findOne({ where: { id } });
      res.status(200).json({ feed: updateFeed });
    } else {
      res.status(404).json({ error: "Feed not found" });
    }
  } catch (error) {
    console.error("Error updating feed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteFeed = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Feed.destroy({ where: { id } });
    if (deleted) {
      res.status(200).json({ message: "Feed deleted successfully" });
    } else {
      res.status(404).json({ error: "Feed not found" });
    }
  } catch (error) {
    console.error("Error deleting feed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const addLike = async (req, res) => {
  const { userId, feedId, commentId } = req.body;
  const transaction = await sequelize.transaction();

  try {
    let target;
    if (feedId) {
      target = await Feed.findByPk(feedId, { transaction });
      if (!target) {
        throw new Error("Feed not Found");
      }
    } else if (commentId) {
      target = await Comments.findByPk(commentId, { transaction });
      if (!target) {
        throw new Error("Comment not Found");
      }
    } else {
      throw new Error("Either feedId or commentId must be provided");
    }

    const existingLike = await Like.findOne({
      where: { userId, feedId: feedId || null, commentId: commentId || null },
      transaction,
    });
    if (existingLike) {
      await Like.destroy({
        where: { userId, feedId: feedId || null, commentId: commentId || null },
        transaction,
      });
      target.likeCount -= 1;
    } else {
      await Like.create({ userId, feedId, commentId }, { transaction });
      target.likeCount += 1;
    }
    await target.save({ transaction });
    await transaction.commit();
    res
      .status(200)
      .json({ message: existingLike ? "Like Removed" : "Like added" });
  } catch (error) {
    await transaction.rollback();
    console.error("Error adding like:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getLikes = async (req, res) => {
  const { feedId, commentId } = req.query;
  const feed = req.query.feedId || null;
  const comment = req.query.commentId || null;

  try {
    const feedLikes = await Like.findAll({
      where: { feedId: feed, commentId: comment },
      include: User,
    });
    res.status(200).json(feedLikes);
  } catch (error) {
    console.error("Error retrieving likes", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const addComment = async (req, res) => {
  const { feedId, userId, comment, parentId } = req.body;
  const transaction = await sequelize.transaction();
  try {
    const feed = await Feed.findByPk(feedId, { transaction });
    if (!feed) {
      throw new Error("Feed not found");
    }

    const newComment = await Comments.create(
      { feedId, userId, comment, parentId: parentId || null },
      { transaction }
    );
    feed.commentCount += 1;
    await feed.save({ transaction });
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
  try {
    const comments = await Comments.findAll({
      where: { feedId, parentId: null },
      order: [["createdAt", "DESC"]],

      include: [
        {
          model: User,
          as: "CommentUser",
        },
        {
          model: Comments,
          as: "Replies",
          order: [["createdAt", "ASC"]],

          include: [
            {
              model: User,
              as: "ReplyUser",
            },
            {
              model: Comments,
              as: "NestedReplies",
              order: [["createdAt", "ASC"]],

              include: [
                {
                  model: User,
                  as: "NestedReplyUser",
                },
                //if going deeper replies add
              ],
            },
          ],
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
  const { id } = req.params;
  const { comment } = req.body;

  try {
    const updatedComment = await Comments.update(
      { comment },
      { where: { id } }
    );
    if (!updatedComment) {
      res.status(404).json({ error: "Comment not updated" });
    } else {
      const comment = await Comments.findByPk(id);
      res.status(200).json(comment);
    }
  } catch (error) {
    console.error("Error Updating comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteComment = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedComment = await Comments.destroy({ where: { id } });

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
  addFeed,
  getFeeds,
  getFeed,
  updateFeed,
  deleteFeed,
  addLike,
  getLikes,
  addComment,
  getComments,
  updateComment,
  deleteComment,
};
