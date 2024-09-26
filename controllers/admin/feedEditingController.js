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

module.exports = {
  getPendingFeeds,
};
