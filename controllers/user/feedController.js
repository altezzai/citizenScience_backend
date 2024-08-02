const { where } = require("sequelize");
const sequelize = require("../../config/connection");
const Feed = require("../../models/feed");
const Like = require("../../models/like");
const User = require("../../models/user");
const Comments = require("../../models/comments");
const FeedMentions = require("../../models/feedmentions");
const upload = require("../../config/uploadConfig");
const SavedFeeds = require("../../models/savedfeeds");
const Hashtags = require("../../models/hashtags");
const PostHashtags = require("../../models/posthashtags");

const addFeed = async (req, res) => {
  const { link, description, userId, mentionIds, hashTags } = req.body;
  const fileName = req.file ? req.file.filename : null;

  let parsedMentionIds = Array.isArray(mentionIds) ? mentionIds : [];
  let parsedHashTags = Array.isArray(hashTags) ? hashTags : [];

  //this is for the postman json string format
  if (typeof mentionIds === "string") {
    try {
      parsedMentionIds = JSON.parse(mentionIds);
    } catch (e) {
      console.error("Error parsing mentionIds:", e);
      parsedMentionIds = [];
    }
  }

  if (typeof hashTags === "string") {
    try {
      parsedHashTags = JSON.parse(hashTags);
    } catch (e) {
      console.error("Error parsing hashTags:", e);
      parsedHashTags = [];
    }
  }

  const validHashTags = parsedHashTags.filter((tag) => tag.trim() !== "");

  const transaction = await sequelize.transaction();

  try {
    const newFeed = await Feed.create(
      {
        fileName,
        link,
        description,
        userId,
      },
      { transaction }
    );
    if (parsedMentionIds.length > 0) {
      const feedMentions = parsedMentionIds.map((index) => ({
        userId: index,
        feedId: newFeed.id,
      }));
      await FeedMentions.bulkCreate(feedMentions, { transaction });
    }

    if (validHashTags.length > 0) {
      const hashtagPromises = validHashTags.map(async (tag) => {
        const [hashtag] = await Hashtags.findOrCreate({
          where: { hashtag: tag },
          defaults: { usageCount: 0 },
          transaction,
        });
        await hashtag.increment("usageCount", { transaction });
        return hashtag.id;
      });

      const hashtagIds = await Promise.all(hashtagPromises);

      const postHashtags = hashtagIds.map((hashtagId) => ({
        feedId: newFeed.id,
        hashtagId: hashtagId,
      }));
      await PostHashtags.bulkCreate(postHashtags, { transaction });
    }

    await transaction.commit();

    res.status(201).json(newFeed);
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating feed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getFeeds = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const feeds = await Feed.findAll({
      offset,
      limit,
      order: [["createdAt", "DESC"]],
      include: [
        { model: User, attributes: ["id", "username", "profilePhoto"] },
        {
          model: FeedMentions,
          attributes: [],
          include: [
            {
              model: User,
              attributes: ["id", "username"],
            },
          ],
        },
        {
          model: PostHashtags,
          attributes: [],
          include: [
            {
              model: Hashtags,
              attributes: ["hashtag"],
            },
          ],
        },
      ],
    });
    res.status(200).json(feeds);
  } catch (error) {
    console.error("Error fetching feeds:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getFeed = async (req, res) => {
  const { feedId } = req.params;
  const page = parseInt(req.query.page) || 1;

  try {
    const feed = await Feed.findByPk(feedId, {
      include: [
        {
          model: User,
          attributes: ["username", "profilePhoto"],
        },
        {
          model: FeedMentions,
          attributes: [],
          include: [
            {
              model: User,
              attributes: ["id", "username"],
            },
          ],
        },
        {
          model: PostHashtags,
          attributes: [],
          include: [
            {
              model: Hashtags,
              attributes: ["hashtag"],
            },
          ],
        },
      ],
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
  const { link, description, mentionIds, hashTags } = req.body;

  const transaction = await sequelize.transaction();

  try {
    const feedUpdateFields = {};
    if (link !== undefined) feedUpdateFields.link = link;
    if (description !== undefined) feedUpdateFields.description = description;

    const feedExist = await Feed.findByPk(id);
    if (!feedExist) {
      // throw new Error("Feed not found");
      return res.status(404).json({ error: "Feed not found" });
    }

    if (Object.keys(feedUpdateFields).length > 0) {
      const [updated] = await Feed.update(feedUpdateFields, {
        where: { id },
        transaction,
      });
      if (!updated) {
        await transaction.rollback();
        return res.status(404).json({ error: "Feed not found" });
      }
    }

    if (mentionIds && Array.isArray(mentionIds)) {
      const currentMentions = await FeedMentions.findAll({
        where: { feedId: id },
        transaction,
      });

      const currentMentionIds = currentMentions.map(
        (mention) => mention.userId
      );

      const mentionsToRemove = currentMentionIds.filter(
        (userId) => !mentionIds.includes(userId)
      );
      const mentionsToAdd = mentionIds.filter(
        (userId) => !currentMentionIds.includes(userId)
      );

      if (mentionsToRemove.length > 0) {
        await FeedMentions.destroy({
          where: { feedId: id, userId: mentionsToRemove },
          transaction,
        });
      }

      if (mentionsToAdd.length > 0) {
        const feedMentions = mentionsToAdd.map((userId) => ({
          userId,
          feedId: id,
        }));
        await FeedMentions.bulkCreate(feedMentions, { transaction });
      }
    }

    if (hashTags && Array.isArray(hashTags)) {
      const validHashTags = hashTags.filter((tag) => tag.trim() !== "");

      const currentHashtags = await PostHashtags.findAll({
        where: { feedId: id },
        include: { model: Hashtags, attributes: ["id", "hashtag"] },
        transaction,
      });

      const currentHashtagMap = currentHashtags.reduce((acc, ph) => {
        if (ph.Hashtags && ph.Hashtags.hashtag) {
          acc[ph.Hashtags.hashtag] = ph.Hashtags.id;
        }
        return acc;
      }, {});

      const newHashtags = validHashTags.filter(
        (tag) => !currentHashtagMap[tag]
      );
      const removedHashtags = currentHashtags.filter(
        (ph) => !validHashTags.includes(ph.Hashtags && ph.Hashtags.hashtag)
      );

      // Remove hashtags
      await Promise.all(
        removedHashtags.map(async (ph) => {
          const hashtag = await Hashtags.findByPk(ph.hashtagId, {
            transaction,
          });
          if (hashtag) {
            await hashtag.decrement("usageCount", { by: 1, transaction });
          } else {
            console.error(`Hashtag with ID ${ph.hashtagId} not found.`);
          }

          await PostHashtags.destroy({
            where: { feedId: id, hashtagId: ph.hashtagId },
            transaction,
          });
        })
      );

      // Add new hashtags
      const newHashtagPromises = newHashtags.map(async (tag) => {
        const [hashtag] = await Hashtags.findOrCreate({
          where: { hashtag: tag },
          defaults: { usageCount: 0 },
          transaction,
        });
        await hashtag.increment("usageCount", { by: 1, transaction });
        return hashtag.id;
      });

      const newHashtagIds = await Promise.all(newHashtagPromises);

      const postHashtags = newHashtagIds.map((hashtagId) => ({
        feedId: id,
        hashtagId,
      }));
      await PostHashtags.bulkCreate(postHashtags, { transaction });
    }

    await transaction.commit();

    const updatedFeed = await Feed.findOne({ where: { id } });
    res.status(200).json({ feed: updatedFeed });
  } catch (error) {
    await transaction.rollback();
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
  const feedId = req.query.feedId ? parseInt(req.query.feedId) : null;
  const commentId = req.query.commentId ? parseInt(req.query.commentId) : null;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const offset = (page - 1) * limit;

  try {
    const feedLikes = await Like.findAll({
      offset,
      limit,
      where: { feedId, commentId },
      attributes: [],
      include: [
        {
          model: User,
          attributes: ["id", "username", "profilePhoto"],
        },
      ],
    });
    res.status(200).json(feedLikes);
  } catch (error) {
    console.error("Error retrieving likes", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const addComment = async (req, res) => {
  const { feedId, userId, comment, mentionIds, parentId } = req.body;
  const transaction = await sequelize.transaction();
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
    await transaction.commit();
    res.status(200).json(newComment);
  } catch (error) {
    await transaction.rollback();
    console.error("error adding comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const getComments = async (req, res) => {
  const feedId = parseInt(req.query.feedId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const offset = (page - 1) * limit;

  try {
    const comments = await Comments.findAll({
      offset,
      limit,
      where: { feedId, parentId: null },
      order: [["createdAt", "DESC"]],

      include: [
        {
          model: User,
          as: "CommentUser",
          attributes: ["username", "profilePhoto"],
        },
        {
          model: FeedMentions,
          attributes: ["id"],
          include: [
            {
              model: User,
              attributes: ["id", "username", "profilePhoto"],
            },
          ],
        },
        {
          model: Comments,
          as: "Replies",
          attributes: ["comment", "likeCount", "parentId"],
          order: [["createdAt", "ASC"]],

          include: [
            {
              model: User,
              attributes: ["id", "username", "profilePhoto"],
              as: "ReplyUser",
            },
            {
              model: Comments,
              as: "NestedReplies",
              attributes: ["comment", "likeCount", "parentId"],

              order: [["createdAt", "ASC"]],

              include: [
                {
                  model: User,
                  as: "NestedReplyUser",
                  attributes: ["id", "username", "profilePhoto"],
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
  const { comment, mentionIds } = req.body;

  const transaction = await sequelize.transaction();

  try {
    const updatedComment = await Comments.update(
      { comment },
      { where: { id }, transaction }
    );
    if (!updatedComment) {
      await transaction, rollback();
      res.status(404).json({ error: "Comment not updated" });
    }

    if (mentionIds && Array.isArray(mentionIds)) {
      await FeedMentions.destroy({ where: { commentId: id }, transaction });

      const feedMentions = mentionIds.map((userId) => ({
        userId,
        commentId: id,
      }));
      await FeedMentions.bulkCreate(feedMentions, { transaction });
    }
    await transaction.commit();

    const commentI = await Comments.findByPk(id);
    res.status(200).json(commentI);
  } catch (error) {
    await transaction.rollback();
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

const saveFeed = async (req, res) => {
  const { userId, feedId } = req.body;
  const transaction = await sequelize.transaction();

  try {
    const feed = await Feed.findByPk(feedId, { transaction });
    if (!feed) {
      throw new Error("Feed not found");
    }
    const existingfeed = await SavedFeeds.findOne({
      where: { userId, feedId },
      transaction,
    });

    if (existingfeed) {
      await SavedFeeds.destroy({ where: { userId, feedId }, transaction });
      feed.savedCount -= 1;
    } else {
      await SavedFeeds.create({ userId, feedId }, { transaction });
      feed.savedCount += 1;
    }
    await feed.save({ transaction });
    await transaction.commit();
    res.status(200).json({
      message: existingfeed
        ? "Feed removed from saved successfully"
        : "Feed saved successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error saving feeds", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getSavedFeeds = async (req, res) => {
  const userId = parseInt(req.query.userId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const savedfeeds = await SavedFeeds.findAll({
      offset,
      limit,
      where: { userId },
      attributes: [],
      include: [
        {
          model: Feed,
          include: [
            {
              model: User,
              attributes: ["id", "username", "profilePhoto"],
            },
          ],
        },
      ],
    });
    res.status(200).json({ feeds: savedfeeds });
  } catch (error) {
    console.error("Error retrieving Saved Feeds", error);
    res.status(500).json({ error: "Intrenal server error" });
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
  saveFeed,
  getSavedFeeds,
};
