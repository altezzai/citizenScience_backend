const express = require("express");
const auth = require("../middleware/authMiddleware");

const feedEditingController = require("../controllers/admin/feedEditingController");

const router = express.Router();

router.get("/pendingFeeds", feedEditingController.getPendingFeeds);

module.exports = router;
