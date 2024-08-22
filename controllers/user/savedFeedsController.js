const sequelize = require("../../config/connection");
const Feed = require("../../models/feed");
const User = require("../../models/user");
const SavedFeeds = require("../../models/savedfeeds");

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
  saveFeed,
  getSavedFeeds,
};
