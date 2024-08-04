const express = require("express");

const feedController = require("../controllers/user/feedController");
const connectionController = require("../controllers/user/connectionController");
const upload = require("../config/uploadConfig");

const router = express.Router();

router.post("/addFeed", upload.single("file"), feedController.addFeed);
router.get("/feeds", feedController.getFeeds);
router.get("/feed/:feedId", feedController.getFeed);
router.post("/updateFeed/:id", feedController.updateFeed);
router.post("/deleteFeed/:id", feedController.deleteFeed);
router.post("/addLike", feedController.addLike);
router.get("/likes", feedController.getLikes);
router.post("/addComment", feedController.addComment);
router.get("/comments", feedController.getComments);
router.post("/updateComment/:id", feedController.updateComment);
router.post("/deleteComment/:id", feedController.deleteComment);
router.post("/saveFeed", feedController.saveFeed);
router.get("/savedFeeds", feedController.getSavedFeeds);

router.post("/follow", connectionController.follow);
router.get("/followers", connectionController.followers);
router.post("/following", connectionController.following);
router.get("/followings", connectionController.followings);

module.exports = router;
