const express = require("express");

const feedController = require("../controllers/user/feedController");
const commentController = require("../controllers/user/commentController");
const likeController = require("../controllers/user/likeController");
const savedFeedsController = require("../controllers/user/savedFeedsController");
const connectionController = require("../controllers/user/connectionController");
const notificationController = require("../controllers/user/notificationController");
const chatController = require("../controllers/user/chatController");
const searchController = require("../controllers/user/searchController");
const upload = require("../config/uploadConfig");

const router = express.Router();

router.post("/feeds", upload.array("files", 10), feedController.addFeed);
router.get("/feeds", feedController.getFeeds);
router.get("/feeds/:feedId", feedController.getFeed);
router.get("/profile/feeds", feedController.getUserFeeds);
router.put("/feeds/:id", feedController.updateFeed);
router.delete("/feeds/:id", feedController.deleteFeed);

router.post("/feeds/likes", likeController.addLike);
router.get("/feeds/:feedId/likes", likeController.getLikes);

router.post("/feeds/updateCounts", feedController.updateCounts);

router.post("/feeds/:feedId/comments", commentController.addComment);
router.get("/feeds/:feedId/comments", commentController.getComments);
router.get("/feeds/:feedId/comments/:commentId", commentController.getReplies);
router.put(
  "/feeds/:feedId/comments/:commentId",
  commentController.updateComment
);
router.delete(
  "/feeds/:feedId/comments/:commentId",
  commentController.deleteComment
);

router.post("/saved-feeds", savedFeedsController.saveFeed);
router.get("/saved-feeds", savedFeedsController.getSavedFeeds);

router.post("/follow", connectionController.follow);
router.get("/followers", connectionController.followers);
router.get("/followings", connectionController.followings);

// router.get("/notifications", notificationController.notifications);
router.get("/notifications", notificationController.getUserNotifications);
router.put(
  "/notifications/:notificationId",
  notificationController.markNotificationAsRead
);

// chat section
router.post("/chat/icon", upload.single("file"), chatController.iconUpload);
router.post(
  "/chat/media",
  upload.array("files", 10),
  chatController.mediaUpload
);

//search section
router.get("/search",searchController.searchUsers);
router.get("/chat/:chatId/member", searchController.searchMembers);
router.get("/chat", searchController.searchConversations);

module.exports = router;
