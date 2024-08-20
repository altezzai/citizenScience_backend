const { Op } = require("sequelize");
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
const { addNotification } = require("./notificationController");
const Notifications = require("../../models/notifications");
const Followers = require("../../models/followers");

const addFeed = async (req, res) => {
  const { link, description, userId, mentionIds, hashTags } = req.body;
  const files = req.files || [];

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
    const fileName = files.map((file) => file.filename);
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

      for (const mentionedUserId of parsedMentionIds) {
        await addNotification(
          mentionedUserId,
          userId,
          "mention",
          "mentioned you in a feed",
          newFeed.id,
          null, // No commentId for feed mentions
          `/feed/${newFeed.id}`,
          "Medium",
          transaction
        );
      }
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
  const userId = parseInt(req.query.userId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const followers = await Followers.findAll({
      where: { followerId: userId },
      attributes: ["followingId"],
    });

    const feedUserIds = [
      userId,
      ...followers.map((follower) => follower.followingId),
    ];
    const feeds = await Feed.findAll({
      offset,
      limit,
      where: { userId: feedUserIds },
      order: [["createdAt", "DESC"]],
      include: [
        { model: User, attributes: ["id", "username", "profilePhoto"] },
        {
          model: FeedMentions,
          attributes: ["id"],
          include: [
            {
              model: User,
              attributes: ["id", "username"],
            },
          ],
        },
        {
          model: PostHashtags,
          attributes: ["hashtagId"],
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
          attributes: ["id"],
          include: [
            {
              model: User,
              attributes: ["id", "username"],
            },
          ],
        },

        {
          model: PostHashtags,
          attributes: ["hashtagId"],
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
        await Notifications.destroy({
          where: {
            userId: mentionsToRemove,
            type: "mention",
            feedId: id,
          },
          transaction,
        });
      }

      if (mentionsToAdd.length > 0) {
        const feedMentions = mentionsToAdd.map((userId) => ({
          userId,
          feedId: id,
        }));
        await FeedMentions.bulkCreate(feedMentions, { transaction });

        for (const mentionedUserId of mentionsToAdd) {
          await addNotification(
            mentionedUserId,
            feedExist.userId,
            "mention",
            "mentioned you in a post",
            id,
            null,
            `/feed/${id}`,
            "Medium",
            transaction
          );
        }
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
  const { userId, feedIds = [], commentIds = [] } = req.body;
  const transaction = await sequelize.transaction();

  try {
    const existingFeeds = await Feed.findAll({
      where: {
        id: {
          [Op.in]: feedIds,
        },
      },
      transaction,
    });

    const existingComments = await Comments.findAll({
      where: {
        id: {
          [Op.in]: commentIds,
        },
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

const getLikes = async (req, res) => {
  const { feedId } = req.params;
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
  const { feedId } = req.params;
  const { userId, comment, mentionIds, parentId } = req.body;
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
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM Comments AS Replies
              WHERE Replies.parentId = Comments.id
            )`),
            "replyCount",
          ],
        ],
      },
      include: [
        {
          model: User,
          as: "CommentUser",
          attributes: ["username", "profilePhoto"],
        },
        {
          model: FeedMentions,
          attributes: ["id"],
          order: [["createdAt", "ASC"]],
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
              model: FeedMentions,
              attributes: ["id"],
              order: [["createdAt", "ASC"]],
              include: [
                {
                  model: User,
                  attributes: ["id", "username", "profilePhoto"],
                },
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
  const { commentId } = req.params;
  const { comment, mentionIds } = req.body;

  const transaction = await sequelize.transaction();

  try {
    const commentInstance = await Comments.findByPk(id, { transaction });

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
        where: { commentId: id },
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
            commentId: id,
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
            id,
            `/feed/${commentInstance.feedId}`,
            "Medium",
            transaction
          );
        }
      }
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

const updateCounts = async (req, res) => {
  const { viewList, shareList } = req.body;

  const transaction = await sequelize.transaction();
  try {
    const allFeedIds = [...new Set([...viewList, ...shareList])];

    const existingFeeds = await Feed.findAll({
      where: {
        id: {
          [Op.in]: allFeedIds,
        },
      },
      attributes: ["id"],
      transaction,
    });

    const existingFeedIds = existingFeeds.map((feed) => feed.id);

    const nonExistingFeedIds = allFeedIds.filter(
      (id) => !existingFeedIds.includes(id)
    );

    if (nonExistingFeedIds.length > 0) {
      console.error("The following feedIds do not exist:", nonExistingFeedIds);
    }

    const validViewList = viewList.filter((id) => existingFeedIds.includes(id));
    const validShareList = shareList.filter((id) =>
      existingFeedIds.includes(id)
    );

    if (validViewList.length > 0) {
      await Feed.increment("viewsCount", {
        by: 1,
        where: {
          id: validViewList,
        },
        transaction,
      });
    }

    if (validShareList.length > 0) {
      await Feed.increment("shareCount", {
        by: 1,
        where: {
          id: validShareList,
        },
        transaction,
      });
    }

    await transaction.commit();

    res.status(200).json({
      message:
        "Views and shares updated successfully for the following feedIds:",
      existingFeedIds,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating views and shares:", error);
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
  saveFeed,
  getSavedFeeds,
  updateCounts,
};
