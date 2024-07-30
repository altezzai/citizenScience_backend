const express = require("express");

const feedController = require("../controllers/user/feedController");

const router = express.Router();

router.post("/addFeed", feedController.addFeed);
router.get("/feeds", feedController.getFeeds);
router.post("/updateFeed/:id", feedController.updateFeed);
router.post("/deleteFeed/:id", feedController.deleteFeed);
router.post("/addLike", feedController.addLike);
router.get("/likes", feedController.getLikes);
router.post("/addComment", feedController.addComment);
router.get("/comments/:feedId", feedController.getComments);
router.post("/updateComment/:id", feedController.updateComment);
router.post("/deleteComment/:id", feedController.deleteComment);

module.exports = router;
