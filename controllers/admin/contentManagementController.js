const { Sequelize, Op } = require("sequelize");

const {
  repositorySequelize,
  skrollsSequelize,
} = require("../../config/connection");
const Feed = require("../../models/feed");
const { addNotification } = require("../user/notificationController");

const getContents = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  try {
    const { count, rows: feeds } = await Feed.findAndCountAll({
      limit,
      offset,
      where: {
        feedActive: true,
        isDeleted: false,
      },
      attributes: ["id", "description", "simplified_description", "fileName"],
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      totalFeeds: count,
      totalPages,
      currentPage: page,
      feeds,
    });
  } catch (error) {
    console.error("Error fetching feeds:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteContent = async (req, res) => {
  const { id } = req.params;

  const transaction = await skrollsSequelize.transaction();

  try {
    const userId = req.user.id;

    const feedExist = await Feed.findOne({
      where: { id, feedActive: true, isDeleted: false },
      transaction,
    });
    console.log(feedExist);
    if (!feedExist) {
      return res.status(404).json({ error: "Feed not found" });
    }

    const deleted = await Feed.update(
      { isDeleted: true },
      { where: { id } },
      transaction
    );

    await addNotification(
      userId,
      feedExist.userId,
      "custom",
      "Admin deleted your feed",
      feedExist.id,
      null,
      null,
      "High",
      transaction
    );
    await transaction.commit();

    res.status(200).json({ message: "Feed deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting feed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getContents,
  deleteContent,
};
