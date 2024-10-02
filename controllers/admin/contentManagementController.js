const { Sequelize, Op } = require("sequelize");

const {
  repositorySequelize,
  skrollsSequelize,
} = require("../../config/connection");
const Feed = require("../../models/feed");

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

module.exports = {
  getContents,
};
