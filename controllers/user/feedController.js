const { Sequelize, Op } = require("sequelize");
const {
  repositorySequelize,
  skrollsSequelize,
} = require("../../config/connection");
const Feed = require("../../models/feed");
const Like = require("../../models/like");
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

  const transaction = await skrollsSequelize.transaction();

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
      attributes: {
        include: [
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
              SELECT profilePhoto
              FROM repository.Users AS users
              WHERE users.id = Feed.userId
            )`),
            "profilePhoto",
          ],
        ],
      },
      include: [
        {
          model: FeedMentions,
          attributes: [
            "id",
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
        {
          model: Like,
          attributes: ["id"],
          where: {
            userId: userId,
          },
          required: false,
        },
        {
          model: SavedFeeds,
          attributes: ["id"],
          where: { userId: userId },
          required: false,
        },
      ],
    });

    const processedFeeds = feeds.map((feed) => {
      return {
        ...feed.toJSON(),
        likedByUser: feed.Likes.length > 0,
        savedByUser: feed.SavedFeeds.length > 0,
      };
    });
    res.status(200).json(processedFeeds);
  } catch (error) {
    console.error("Error fetching feeds:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getFeed = async (req, res) => {
  const { feedId } = req.params;
  const userId = parseInt(req.query.userId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const feed = await Feed.findByPk(feedId, {
      attributes: {
        include: [
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
              SELECT profilePhoto
              FROM repository.Users AS users
              WHERE users.id = Feed.userId
            )`),
            "profilePhoto",
          ],
        ],
      },
      include: [
        {
          model: FeedMentions,
          attributes: [
            "id",
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
        {
          model: Like,
          attributes: ["id"],
          where: {
            userId: userId,
          },
          required: false,
        },
        {
          model: SavedFeeds,
          attributes: ["id"],
          where: { userId: userId },
          required: false,
        },
      ],
    });
    if (!feed) {
      return res.status(404).json({ message: "Feed not found" });
    }

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
            "id",
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

    const feedWithLikeStatus = {
      ...feed.toJSON(),
      likedByUser: feed.Likes.length > 0,
      savedByUser: feed.SavedFeeds.length > 0,
      comments: comments,
    };

    res.status(200).json(feedWithLikeStatus);
  } catch (error) {
    console.error("Error fetching feed:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getUserFeeds = async (req, res) => {
  const userId = parseInt(req.query.userId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const feeds = await Feed.findAll({
      offset,
      limit,
      where: { userId: userId },
      order: [["createdAt", "DESC"]],
      attributes: {
        include: [
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
              SELECT profilePhoto
              FROM repository.Users AS users
              WHERE users.id = Feed.userId
            )`),
            "profilePhoto",
          ],
        ],
      },
      include: [
        {
          model: FeedMentions,
          attributes: [
            "id",
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
        {
          model: Like,
          attributes: ["id"],
          where: {
            userId: userId,
          },
          required: false,
        },
        {
          model: SavedFeeds,
          attributes: ["id"],
          where: { userId: userId },
          required: false,
        },
      ],
    });

    const processedFeeds = feeds.map((feed) => {
      return {
        ...feed.toJSON(),
        likedByUser: feed.Likes.length > 0,
        savedByUser: feed.SavedFeeds.length > 0,
      };
    });
    res.status(200).json(processedFeeds);
  } catch (error) {
    console.error("Error fetching feeds:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateFeed = async (req, res) => {
  const { id } = req.params;
  const { link, description, mentionIds, hashTags } = req.body;

  const transaction = await skrollsSequelize.transaction();

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

const updateCounts = async (req, res) => {
  const { viewList, shareList } = req.body;

  const transaction = await skrollsSequelize.transaction();
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
  getUserFeeds,
  updateFeed,
  deleteFeed,
  updateCounts,
};
