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
router.get("/feeds/:feedId", auth, feedController.getFeed);
router.get("/profile/feeds", auth, feedController.getUserFeeds);
router.put("/feeds/:id", auth, feedController.updateFeed);
router.delete("/feeds/:id", auth, feedController.deleteFeed);
router.post("/feeds/updateCounts", auth, feedController.updateCounts);

router.post("/feeds/likes", auth, likeController.addLike);
router.get("/feeds/:feedId/likes", auth, likeController.getFeedLikes);
router.get(
  "/feeds/comments/:commentId/likes",
  auth,
  likeController.getCommentLikes
);

router.post("/feeds/:feedId/comments", auth, commentController.addComment);
router.get("/feeds/:feedId/comments", auth, commentController.getComments);
router.get(
  "/feeds/:feedId/comments/:commentId",
  auth,
  commentController.getReplies
);
router.put(
  "/feeds/:feedId/comments/:commentId",
  auth,
  commentController.updateComment
);
router.delete(
  "/feeds/:feedId/comments/:commentId",
  auth,
  commentController.deleteComment
);

router.post("/savedFeeds", auth, savedFeedsController.saveFeed);
router.get("/savedFeeds", auth, savedFeedsController.getSavedFeeds);

router.post("/follow", auth, connectionController.follow);
router.get("/followers", auth, connectionController.followers);
router.get("/followings", auth, connectionController.followings);

// router.get("/notifications", notificationController.notifications);
router.get("/notifications", auth, notificationController.getUserNotifications);
router.put(
  "/notifications",
  auth,
  notificationController.markNotificationAsRead
);

// chat section
router.post(
  "/chat/icon",
  auth,
  upload.single("file"),
  chatController.iconUpload
);
router.post(
  "/chat/media",
  auth,
  upload.array("files", 10),
  chatController.mediaUpload
);

//Interest section
router.post("/profile/interest", auth, interestController.addInterest);
router.get(
  "/profile/:userId/interest",
  auth,
  interestController.getUserInterests
);
router.put("/profile/interest", auth, interestController.updateUserInterests);

//Skill section
router.post("/profile/skill", auth, skillController.addSkills);
router.get("/profile/:userId/skill", auth, skillController.getUserSkills);
router.put("/profile/skill", auth, skillController.updateUserSkills);

//Experience section
router.post("/profile/experience", auth, experienceController.addExperience);
router.get(
  "/profile/:userId/experience",
  auth,
  experienceController.getExperiences
);
router.put(
  "/profile/experience/:id",
  auth,
  experienceController.updateExperience
);
router.delete(
  "/profile/experience/:id",
  auth,
  experienceController.deleteExperience
);

//Education section
router.post("/profile/education", auth, educationController.addEducation);
router.get(
  "/profile/:userId/education",
  auth,
  educationController.getEducations
);
router.put("/profile/education/:id", auth, educationController.updateEducation);
router.delete(
  "/profile/education/:id",
  auth,
  educationController.deleteEducation
);

//profile section
router.get("/profileDetails", auth, profileController.profileDetails);
router.post("/profile/otherId", auth, profileController.addOtherIds);
router.get("/profile/:userId/otherIds", auth, profileController.getOtherIds);
router.put("/profile/otherId/:id", auth, profileController.updateOtherIds);
router.delete("/profile/otherId/:id", auth, profileController.deleteOtherIds);

//search section
router.get("/search/user", auth, searchController.searchUsers);
router.get("/search/hashtag", auth, searchController.searchHashtags);
router.get("/feed/search/hashtag", auth, searchController.searchFeedHashtags);
router.get("/search/communities", auth, searchController.searchCommunities);
router.get("/chat/:chatId/members", auth, searchController.searchMembers);
router.get("/chat", auth, searchController.searchConversations);

//profileSettingsController section
router.put(
  "/settings/editProfile/registerAuthor",
  auth,
  profileSettingsController.registerAsAuthor
);

// accountSettingsController section
router.put(
  "/settings/accountSetting/deactivate",
  auth,
  accountSettingsController.deactivateAccount
);
router.put(
  "/settings/accountSetting/delete",
  auth,
  accountSettingsController.deleteAccount
);

module.exports = router;
