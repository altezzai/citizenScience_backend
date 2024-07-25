const express = require("express");

const feedController = require("../controllers/user/feedController");

const router = express.Router();

router.post("/addFeed", feedController.addFeed);

module.exports = router;
