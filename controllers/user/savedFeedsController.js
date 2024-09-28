const { Sequelize } = require("sequelize");

const {
  skrollsSequelize,
  repositorySequelize,
} = require("../../config/connection");
const Feed = require("../../models/feed");
const SavedFeeds = require("../../models/savedfeeds");
const User = require("../../models/user");

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
            { feedActive: true },
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
        },
      ],
    });

    if (count === 0) {
      return res.status(404).json({ message: "No saved feeds found" });
    }

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      totalsavedFeeds: count,
      totalPages,
      currentPage: page,
      feeds: savedfeeds,
    });
  } catch (error) {
    console.error("Error retrieving Saved Feeds", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  saveFeed,
  getSavedFeeds,
};
