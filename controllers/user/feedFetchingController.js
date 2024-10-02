const { Sequelize, Op } = require("sequelize");
const {
  repositorySequelize,
  skrollsSequelize,
} = require("../../config/connection");
const Feed = require("../../models/feed");
const Like = require("../../models/like");
const Comments = require("../../models/comments");
const FeedMentions = require("../../models/feedmentions");
const SavedFeeds = require("../../models/savedfeeds");
const Hashtags = require("../../models/hashtags");
const PostHashtags = require("../../models/posthashtags");
const Followers = require("../../models/followers");
const Chats = require("../../models/chats");
const CommunityFeeds = require("../../models/communityfeeds");
const User = require("../../models/user");

const getFeeds = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const userId = req.user.id;
    const followers = await Followers.findAll({
      where: { followerId: userId },
      attributes: ["followingId"],
    });

    const feedUserIds = [
      userId,
      ...followers.map((follower) => follower.followingId),
    ];
    const { count, rows: feeds } = await Feed.findAndCountAll({
      distinct: true,

      offset,
      limit,
      where: {
        userId: feedUserIds,
        feedActive: true,
        isDeleted: false,
        isArchive: false,
        [Sequelize.Op.and]: [
          Sequelize.literal(`(
              SELECT isActive 
              FROM repository.Users 
              WHERE repository.Users.id = Feed.userId
            ) = true`),
          Sequelize.literal(`(
              SELECT citizenActive 
              FROM repository.Users 
              WHERE repository.Users.id = Feed.userId
            ) = true`),
        ],
      },
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

    const processedFeeds = feeds.map((feed) => {
      return {
        ...feed.toJSON(),
        likedByUser: feed.Likes.length > 0,
        savedByUser: feed.SavedFeeds.length > 0,
      };
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      totalFeeds: count,
      totalPages,
      currentPage: page,
      feeds: processedFeeds,
    });
  } catch (error) {
    console.error("Error fetching feeds:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getFeed = async (req, res) => {
  const { feedId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const userId = req.user.id;
    const feed = await Feed.findOne({
      where: {
        id: feedId,
        feedActive: true,
        isDeleted: false,
        isArchive: false,
      },

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
    if (!feed) {
      return res.status(404).json({ message: "Feed not found" });
    }

    const { count, rows: comments } = await Comments.findAndCountAll({
      distinct: true,
      offset,
      limit,
      where: { feedId, parentId: null, commentActive: true, isDeleted: false },
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
                SELECT 
                  CASE
                    WHEN (isActive = false OR citizenActive = false)
                    THEN 'skrolls.user'
                    ELSE username
                  END
                FROM repository.Users
                WHERE repository.Users.id = Comments.userId
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
                WHERE repository.Users.id = Comments.userId
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

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      totalComments: count,
      totalPages,
      currentPage: page,
      feeds: feedWithLikeStatus,
    });
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
    const currentUserId = req.user.id;
    const user = await User.findOne({
      where: { id: userId },
      attributes: ["isActive", "citizenActive"],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.isActive || !user.citizenActive) {
      return res.status(403).json({ error: "User is not active" });
    }
    const { count, rows: feeds } = await Feed.findAndCountAll({
      distinct: true,

      offset,
      limit,
      where: {
        userId: userId,
        feedActive: true,
        isDeleted: false,
        isArchive: false,
      },
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
            "id",
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
            userId: currentUserId,
          },
          required: false,
        },
        {
          model: SavedFeeds,
          attributes: ["id"],
          where: { userId: currentUserId },
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

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      totalFeeds: count,
      totalPages,
      currentPage: page,
      feeds: processedFeeds,
    });
  } catch (error) {
    console.error("Error fetching feeds:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getFeeds,
  getFeed,
  getUserFeeds,
};
