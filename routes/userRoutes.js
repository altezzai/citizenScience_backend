const express = require("express");

const feedController = require("../controllers/user/feedController");
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

module.exports = router;
