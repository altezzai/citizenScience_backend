const Feed = require("../../models/feed");
const User = require("../../models/user");

async function addFeed(req, res) {
  const { fileName, link, description, userId } = req.body;

  try {
    const newFeed = await Feed.create({
      fileName,
      link,
      description,
      userId,
    });
    res.status(201).json(newFeed);
  } catch (error) {
    console.error("Error creating feed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

const getFeeds = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const feeds = await Feed.findAll({
      offset,
      limit,
      order: [["createdAt", "DESC"]],
      include: User,
    });
    res.status(200).json(feeds);
  } catch (error) {
    console.error("Error fetching feeds:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  addFeed,
  getFeeds,
};
