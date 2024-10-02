const { Sequelize } = require("sequelize");

const {
  skrollsSequelize,
  repositorySequelize,
} = require("../../config/connection");
const Feed = require("../../models/feed");
const SavedFeeds = require("../../models/savedfeeds");
const User = require("../../models/user");
const FeedMentions = require("../../models/feedmentions");
const PostHashtags = require("../../models/posthashtags");
const Hashtags = require("../../models/hashtags");
const CommunityFeeds = require("../../models/communityfeeds");
const Chats = require("../../models/chats");
const Like = require("../../models/like");

const saveFeed = async (req, res) => {
  const { feedId } = req.body;
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
    const feed = await Feed.findOne({
      where: {
        id: feedId,
        feedActive: true,
        isDeleted: false,
        isArchive: false,
      },
      transaction,
    });
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
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const userId = req.user.id;

    const { count, rows: savedfeeds } = await SavedFeeds.findAndCountAll({
      distinct: true,
      offset,
      limit,
      where: { userId },
      attributes: [],
      include: [
        {
          model: Feed,
          where: Sequelize.and(
            { feedActive: true, isDeleted: false, isArchive: false },
            Sequelize.literal(`(
              SELECT COUNT(*)
              FROM repository.Users AS users
              WHERE users.id = Feed.userId
              AND users.isActive = true
              AND users.citizenActive = true
            ) > 0`)
          ),
          attributes: {
            include: [
              [
                Sequelize.literal(`(
                  SELECT username
                  FROM repository.Users AS users
                  WHERE users.id = Feed.userId
                  AND users.isActive = true
                  AND users.citizenActive = true
                )`),
                "username",
              ],
              [
                Sequelize.literal(`(
                  SELECT profile_image
                  FROM repository.Users AS users
                  WHERE users.id = Feed.userId
                  AND users.isActive = true
                  AND users.citizenActive = true
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
                      SELECT 
                        CASE
                          WHEN (isActive = false OR citizenActive = false)
                          THEN 'skrolls.user'
                          ELSE username
                        END
                      FROM repository.Users
                      WHERE repository.Users.id = \`Feed->FeedMentions\`.userId
                    )`),
                  "username",
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
                      WHERE repository.Users.id = \`Feed->FeedMentions\`.userId
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
              model: CommunityFeeds,
              attributes: ["chatId"],
              include: [
                {
                  model: Chats,
                  attributes: ["icon", "name"],
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
          ],
        },
      ],
    });

    if (count === 0) {
      return res.status(404).json({ message: "No saved feeds found" });
    }

    const processedFeeds = savedfeeds.map((feed) => {
      return {
        ...feed.toJSON(),
        likedByUser: feed.Feed.Likes.length > 0,
        savedByUser: true,
      };
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      totalsavedFeeds: count,
      totalPages,
      currentPage: page,
      feeds: processedFeeds,
    });
  } catch (error) {
    console.error("Error retrieving Saved Feeds", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const archiveFeed = async (req, res) => {
  const { feedId } = req.params;
  try {
    const userId = req.user.id;

    const feed = await Feed.findOne({
      where: { id: feedId, feedActive: true, isDeleted: false },
    });

    if (!feed) {
      return res.status(400).json({ error: "Feed not found" });
    }
    if (feed.isArchive) {
      return res.status(400).json({ error: "Feed already archived" });
    }

    if (feed.userId !== userId) {
      return res
        .status(403)
        .json({ error: "You are not authorized to archive this feed" });
    }

    await feed.update({ isArchive: true });

    res.status(200).json({ success: "Feed added to Archive" });
  } catch (error) {
    console.error("Error adding archive", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getArchiveFeeds = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  try {
    const userId = req.user.id;

    const { count, rows: archives } = await Feed.findAndCountAll({
      distinct: true,
      offset,
      limit,
      where: { userId, isDeleted: false, feedActive: true, isArchive: true },
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
                SELECT profile_image
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
                  WHERE repository.Users.id = FeedMentions.userId
                )`),
              "username",
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
                  WHERE repository.Users.id = FeedMentions.userId
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
          model: CommunityFeeds,
          attributes: ["chatId"],
          include: [
            {
              model: Chats,
              attributes: ["icon", "name"],
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

    const processedFeeds = archives.map((feed) => {
      return {
        ...feed.toJSON(),
        likedByUser: feed.Likes.length > 0,
        savedByUser: feed.SavedFeeds.length > 0,
      };
    });

    const totalPages = Math.ceil(count / limit);
    res.status(200).json({
      totalArchivedFeeds: count,
      totalPages,
      currentPage: page,
      feeds: processedFeeds,
    });
  } catch (error) {
    console.error("Error retrieving Saved Feeds", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const removeFromArchive = async (req, res) => {
  const { feedId } = req.params;
  try {
    const userId = req.user.id;

    const feed = await Feed.findOne({
      where: { id: feedId, feedActive: true, isDeleted: false },
    });

    if (!feed) {
      return res.status(400).json({ error: "Feed not found" });
    }
    if (!feed.isArchive) {
      return res.status(400).json({ error: "Feed is not archived yet" });
    }

    if (feed.userId !== userId) {
      return res
        .status(403)
        .json({ error: "You are not authorized to unarchive this feed" });
    }

    await feed.update({ isArchive: false });

    res.status(200).json({ success: "Feed removed from Archive" });
  } catch (error) {
    console.error("Error removing a feed from archive", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  saveFeed,
  getSavedFeeds,
  archiveFeed,
  getArchiveFeeds,
  removeFromArchive,
};
