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

const getUserNotifications = async (req, res) => {
  const userId = parseInt(req.query.userId);
  const limit = parseInt(req.query.limit) || 100;
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  try {
    const notifications = await Notifications.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      limit: 100,
      include: [
        {
          model: User,
          as: "Actor",
          attributes: ["id", "username", "profilePhoto"],
        },
        {
          model: Feed,
          attributes: ["fileName"],
        },
        {
          model: Comments,
          attributes: ["id", "comment"],
        },
      ],
    });

    if (notifications.length === 0) {
      return res.status(200).json([]);
    }

    const groupedNotifications = [];
    let currentLikeGroup = null;

    for (const notification of notifications) {
      const actor = notification.Actor;
      const actorUsername = actor ? actor.username : "Unknown User";
      const actorId = actor ? actor.id : "unknown";
      const actorImage = actor ? actor.profilePhoto : "unknown";

      const notificationData = {
        id: notification.id,
        type: notification.type,
        feedId: notification.feedId,
        commentId: notification.commentId,
        actors: [
          { id: actorId, username: actorUsername, profilePhoto: actorImage },
        ],
        content: notification.content,
        actionURL: notification.actionURL,
        createdAt: notification.createdAt,
        relatedFeed: notification.Feed,
        relatedComment: notification.Comment,
      };

      if (
        notification.type !== "like" ||
        notification.createdAt > tenMinutesAgo
      ) {
        // For non-like notifications or recent likes, add them individually
        groupedNotifications.push({
          ...notificationData,
          count: 1,
          message: formatSingleNotificationMessage(notificationData),
        });
      } else if (notification.type === "like") {
        // For older like notifications, group them
        const groupKey = notification.commentId
          ? `comment_${notification.commentId}`
          : `feed_${notification.feedId}`;
        if (!currentLikeGroup || currentLikeGroup.groupKey !== groupKey) {
          if (currentLikeGroup) {
            groupedNotifications.push(currentLikeGroup);
          }
          currentLikeGroup = {
            ...notificationData,
            groupKey,
            count: 1,
          };
        } else {
          currentLikeGroup.count++;
          if (!currentLikeGroup.actors.some((a) => a.id === actorId)) {
            currentLikeGroup.actors.push({
              id: actorId,
              username: actorUsername,
              profilePhoto: actorImage,
            });
          }
          if (
            new Date(notification.createdAt) >
            new Date(currentLikeGroup.createdAt)
          ) {
            currentLikeGroup.createdAt = notification.createdAt;
          }
        }
      }
    }

    if (currentLikeGroup) {
      groupedNotifications.push(currentLikeGroup);
    }

    const finalGroupedNotifications = groupedNotifications
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
      .map((group) => ({
        ...group,
        message:
          group.count > 1 ? formatGroupedLikeMessage(group) : group.message,
      }));

    res.status(200).json(finalGroupedNotifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

function formatSingleNotificationMessage(notification) {
  switch (notification.type) {
    case "like":
      return notification.commentId
        ? `${notification.actors[0].username} liked your comment`
        : `${notification.actors[0].username} liked your feed`;
    case "comment":
      return `${notification.actors[0].username} commented on your feed`;
    case "follow":
      return `${notification.actors[0].username} started following you`;
    case "mention":
      return `${notification.actors[0].username} mentioned you in a feed`;
    case "custom":
    default:
      return notification.content;
  }
}

function formatGroupedLikeMessage(group) {
  const otherCount = group.count - 1;
  const likeType = group.commentId ? "comment" : "feed";
  if (otherCount === 0) {
    return `${group.actors[0].username} liked your ${likeType}`;
  } else {
    return `${group.actors[0].username} and ${otherCount} other${
      otherCount > 1 ? "s" : ""
    } liked your ${likeType}`;
  }
}

module.exports = {
  addNotification,
  notifications,
  markNotificationAsRead,
  getUserNotifications,
};
