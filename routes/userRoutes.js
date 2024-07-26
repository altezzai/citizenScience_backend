const express = require("express");

const feedController = require("../controllers/user/feedController");

const router = express.Router();

router.post("/addFeed", feedController.addFeed);
router.get("/feeds", feedController.getFeeds);

module.exports = router;
