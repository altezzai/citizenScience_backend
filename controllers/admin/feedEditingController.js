const { Sequelize, Op } = require("sequelize");

const {
  repositorySequelize,
  skrollsSequelize,
} = require("../../config/connection");
const Feed = require("../../models/feed");

const getPendingFeeds = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  try {
    const { count, rows: feeds } = await Feed.findAndCountAll({
      offset,
      limit,
      where: {
        editPermission: true,
        isAdminEdited: false,
        feedActive: true,
        isDeleted: false,
      },
      attributes: ["id", "description"],
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

const getFeedDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const feed = await Feed.findByPk(id, {
      attributes: [
        "id",
        "fileName",
        "link",
        "description",
        "simplified_description",
      ],
    });

    if (!feed) {
      return res.status(400).json({ error: "feed not found" });
    }

    res.status(200).json(feed);
  } catch (error) {
    console.error("Error fetching feeds:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getSolvedFeeds = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  try {
    const { count, rows: feeds } = await Feed.findAndCountAll({
      offset,
      limit,
      where: {
        editPermission: true,
        isAdminEdited: true,
        feedActive: true,
        isDeleted: false,
      },
      attributes: ["id", "description", "simplified_description"],
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

const addDescription = async (req, res) => {
  const { feedId } = req.params;
  const { simplified_description } = req.body;

  try {
    const feed = await Feed.findByPk(feedId);
    if (!feed) {
      return res.status(400).json({ error: "Feed not found" });
    }

    if (!feed.editPermission) {
      return res.status(400).json({ error: "No edit permission" });
    }

    await feed.update({ simplified_description, isAdminEdited: true });
    res.status(200).json({ success: "simplified_description added" });
  } catch (error) {
    console.error(error);
    return res.status(404).json({ error: "Internal server error" });
  }
};

module.exports = {
  getPendingFeeds,
  getFeedDetails,
  getSolvedFeeds,
  addDescription,
};
