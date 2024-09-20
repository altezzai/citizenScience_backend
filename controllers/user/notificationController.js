const { skrollsSequelize } = require("../../config/connection");
const { Sequelize } = require("sequelize");
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

// const notifications = async (req, res) => {
//   const userId = parseInt(req.query.userId);
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 20;
//   const offset = (page - 1) * limit;

//   try {
//     const notifications = await Notifications.findAll({
//       where: { userId },
//       attributes: ["id", "type", "content", "isRead", "actionURL", "priority"],
//       include: [
//         {
//           model: User,
//           as: "Actor",
//           attributes: ["id", "username", "profile_image"],
//         },
//         {
//           model: Feed,
//           attributes: ["id", "fileName"],
//         },
//         {
//           model: Comments,
//           attributes: ["id", "comment"],
//         },
//       ],
//       order: [
//         [
//           sequelize.literal(`CASE
//                 WHEN priority = 'High' THEN 1
//                 WHEN priority = 'Medium' THEN 2
//                 WHEN priority = 'Low' THEN 3
//                 ELSE 4
//                 END`),
//           "ASC",
//         ],
//         ["createdAt", "DESC"],
//       ],
//       offset,
//       limit,
//     });

//     res.status(200).json(notifications);
//   } catch (error) {
//     console.error("Error fetching notifications:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

const markNotificationAsRead = async (req, res) => {
  const { notificationIds } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return res
      .status(400)
      .json({ error: "Invalid input, array of IDs is required" });
  }

  try {
    const result = await Notifications.update(
      { isRead: true },
      {
        where: {
          id: notificationIds,
          userId,
        },
      }
    );

    if (result[0] === 0) {
      return res
        .status(404)
        .json({ error: "No notifications found to update " });
    }

    res.status(200).json({
      message: "Notifications marked as read",
      updatedCount: result[0],
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getUserNotifications = async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  try {
    const userId = req.user.id;

    const notifications = await Notifications.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      limit,
      attributes: {
        include: [
          "isRead",
          [
            Sequelize.literal(`(
              SELECT 
                CASE
                  WHEN (isActive = false OR citizenActive = false)
                  THEN 'skrolls.user'
                  ELSE username
                END
              FROM repository.Users
              WHERE repository.Users.id = Notifications.actorId
            )`),
            "username",
          ],

          [
            Sequelize.literal(`(
              SELECT 
                CASE
                  WHEN (isActive = false OR citizenActive = false)
                  THEN NULL
                  ELSE profile_image
                END
              FROM repository.Users
              WHERE repository.Users.id = Notifications.actorId
            )`),
            "profilePhoto",
          ],
        ],
      },
      include: [
        {
          model: Feed,
          attributes: ["fileName"],
        },
        {
          model: Comments,
          attributes: ["id", "comment"],
        },
      ],
      raw: true,
    });

    if (notifications.length === 0) {
      return res.status(200).json([]);
    }

    const groupedNotifications = [];
    let currentLikeGroup = null;

    for (const notification of notifications) {
      let parsedFileName;
      try {
        parsedFileName = JSON.parse(notification["Feed.fileName"]);
      } catch (error) {
        console.error("Error parsing fileName:", error);
        parsedFileName = notification["Feed.fileName"];
      }
      const notificationData = {
        id: notification.id,
        type: notification.type,
        feedId: notification.feedId,
        commentId: notification.commentId,
        isRead: notification.isRead ? true : false,
        actors: [
          {
            id: notification.actorId,
            username: notification.username,
            profilePhoto: notification.profilePhoto,
          },
        ],
        content: notification.content,
        actionURL: notification.actionURL,
        createdAt: notification.createdAt,
        relatedFeed: notification["Feed.fileName"]
          ? { fileName: parsedFileName }
          : null,
        relatedComment: notification["Comment.id"]
          ? {
              id: notification["Comment.id"],
              comment: notification["Comment.comment"],
            }
          : null,
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
          if (
            !currentLikeGroup.actors.some((a) => a.id === notification.actorId)
          ) {
            currentLikeGroup.actors.push({
              id: notification.actorId,
              username: notification.username,
              profilePhoto: notification.profilePhoto,
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
  markNotificationAsRead,
  getUserNotifications,
};
