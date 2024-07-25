const Feed = require("../../models/feed");

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

module.exports = {
  addFeed,
};
