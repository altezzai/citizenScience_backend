const sequelize = require("../../config/connection");
const Comments = require("../../models/comments");
const Feed = require("../../models/feed");
const Notifications = require("../../models/notifications");
const User = require("../../models/user");

const addNotification = async (
  userId,
  actorId,
  type,
  content,
  feedId,
  commentId,
  actionURL,
  priority,
  transaction
) => {
  try {
    const Notification = await Notifications.create(
      {
        userId,
        actorId,
        type,
        content,
        feedId,
        commentId,
        actionURL,
        priority,
      },
      { transaction }
    );
    return Notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

const notifications = async (req, res) => {
  const userId = parseInt(req.query.userId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const notifications = await Notifications.findAll({
      where: { userId },
      attributes: ["id", "type", "content", "isRead", "actionURL", "priority"],
      include: [
        {
          model: User,
          as: "Actor",
          attributes: ["id", "username", "profilePhoto"],
        },
        {
          model: Feed,
          attributes: ["id", "fileName"],
        },
        {
          model: Comments,
          attributes: ["id", "comment"],
        },
      ],
      order: [
        [
          sequelize.literal(`CASE 
                WHEN priority = 'High' THEN 1 
                WHEN priority = 'Medium' THEN 2 
                WHEN priority = 'Low' THEN 3 
                ELSE 4 
                END`),
          "ASC",
        ],
        ["createdAt", "DESC"],
      ],
      offset,
      limit,
    });

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const markNotificationAsRead = async (req, res) => {
  const { notificationId } = req.params;

  try {
    const notification = await Notifications.findByPk(notificationId);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  addNotification,
  notifications,
  markNotificationAsRead,
};
