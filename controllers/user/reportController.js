const { Sequelize, Op } = require("sequelize");
const { skrollsSequelize } = require("../../config/connection");
const Reports = require("../../models/reports");
const Feed = require("../../models/feed");
const Messages = require("../../models/messages");
const User = require("../../models/user");
const Comments = require("../../models/comments");

const addReport = async (req, res) => {
  const { feedId, userId, commentId, messageId, reason, description } =
    req.body;

  const ids = [feedId, userId, commentId, messageId].filter(Boolean); // Filter out null or undefined values

  if (ids.length !== 1) {
    return res.status(400).json({
      error:
        "Only one of feedId, userId, commentId, or messageId should be provided.",
    });
  }

  if (reason === "other" && (!description || description.trim() === "")) {
    return res.status(400).json({
      error: "Description is required when the reason is 'other'.",
    });
  }

  try {
    const reporter_id = req.user.id;

    if (feedId) {
      const feed = await Feed.findByPk(feedId);
      if (!feed) {
        return res.status(404).json({ error: "Feed not found" });
      }
    }
    if (commentId) {
      const comment = await Comments.findByPk(commentId);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }
    }
    if (messageId) {
      const message = await Messages.findByPk(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
    }
    if (userId) {
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
    }

    const report = await Reports.create({
      reporter_id,
      feedId,
      userId,
      commentId,
      messageId,
      reason,
      description: reason === "other" ? description : null,
    });

    res.status(201).json({ message: "Report created successfully", report });
  } catch (error) {
    console.error("Error adding report:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  addReport,
};
