const express = require("express");

const feedController = require("../controllers/user/feedController");
const commentController = require("../controllers/user/commentController");
const likeController = require("../controllers/user/likeController");
const savedFeedsController = require("../controllers/user/savedFeedsController");
const connectionController = require("../controllers/user/connectionController");
const notificationController = require("../controllers/user/notificationController");
const chatController = require("../controllers/user/chatController");
const searchController = require("../controllers/user/searchController");
const profileController = require("../controllers/user/profileController");
const interestController = require("../controllers/user/interestController");
const skillController = require("../controllers/user/skillController");
const experienceController = require("../controllers/user/experienceController");
const educationController = require("../controllers/user/educationController");
const profileSettingsController = require("../controllers/user/profileSettingsController");
const accountSettingsController = require("../controllers/user/accountSettingsController");
const upload = require("../config/uploadConfig");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/feeds", auth, upload.array("files", 10), feedController.addFeed);
router.get("/feeds", auth, feedController.getFeeds);
router.get("/feeds/:feedId", feedController.getFeed);
router.get("/profile/feeds", feedController.getUserFeeds);
router.put("/feeds/:id", feedController.updateFeed);
router.delete("/feeds/:id", feedController.deleteFeed);
router.post("/feeds/updateCounts", feedController.updateCounts);

router.post("/feeds/likes", likeController.addLike);
router.get("/feeds/:feedId/likes", likeController.getFeedLikes);
router.get("/feeds/comments/:commentId/likes", likeController.getCommentLikes);

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

router.post("/savedFeeds", savedFeedsController.saveFeed);
router.get("/savedFeeds", savedFeedsController.getSavedFeeds);

router.post("/follow", connectionController.follow);
router.get("/followers", connectionController.followers);
router.get("/followings", connectionController.followings);

// router.get("/notifications", notificationController.notifications);
router.get("/notifications", notificationController.getUserNotifications);
router.put("/notifications", notificationController.markNotificationAsRead);

// chat section
router.post("/chat/icon", upload.single("file"), chatController.iconUpload);
router.post(
  "/chat/media",
  upload.array("files", 10),
  chatController.mediaUpload
);

//Interest section
router.post("/profile/:userId/interest", interestController.addInterest);
router.get("/profile/:userId/interest", interestController.getUserInterests);
router.put("/profile/:userId/interest", interestController.updateUserInterests);

//Skill section
router.post("/profile/:userId/skill", skillController.addSkills);
router.get("/profile/:userId/skill", skillController.getUserSkills);
router.put("/profile/:userId/skill", skillController.updateUserSkills);

//Experience section
router.post("/profile/:userId/experience", experienceController.addExperience);
router.get("/profile/:userId/experience", experienceController.getExperiences);
router.put("/profile/experience/:id", experienceController.updateExperience);
router.delete("/profile/experience/:id", experienceController.deleteExperience);

//Education section
router.post("/profile/:userId/education", educationController.addEducation);
router.get("/profile/:userId/education", educationController.getEducations);
router.put("/profile/education/:id", educationController.updateEducation);
router.delete("/profile/education/:id", educationController.deleteEducation);

//profile section
router.get("/profileDetails", profileController.profileDetails);
router.post("/profile/:userId/otherId", profileController.addOtherIds);
router.get("/profile/:userId/otherIds", profileController.getOtherIds);
router.put("/profile/otherId/:id", profileController.updateOtherIds);
router.delete("/profile/otherId/:id", profileController.deleteOtherIds);

//search section
router.get("/search/user", searchController.searchUsers);
router.get("/search/hashtag", searchController.searchHashtags);
router.get("/feed/search/hashtag", searchController.searchFeedHashtags);
router.get("/search/communities", searchController.searchCommunities);
router.get("/chat/:chatId/members", searchController.searchMembers);
router.get("/chat", searchController.searchConversations);

//profileSettingsController section
router.put(
  "/settings/editProfile/registerAuthor",
  profileSettingsController.registerAsAuthor
);

// accountSettingsController section
router.put(
  "/settings/accountSetting/deactivate",
  accountSettingsController.deactivateAccount
);
router.put(
  "/settings/accountSetting/delete",
  accountSettingsController.deleteAccount
);

module.exports = router;
