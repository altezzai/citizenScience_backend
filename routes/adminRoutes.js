const express = require("express");

const feedEditingController = require("../controllers/admin/feedEditingController");
const contentManagementController = require("../controllers/admin/contentManagementController");

const router = express.Router();

router.get("/pendingFeeds", feedEditingController.getPendingFeeds);
router.get("/feedDetails/:id", feedEditingController.getFeedDetails);
router.get("/solvedFeeds", feedEditingController.getSolvedFeeds);

router.get("/contents", contentManagementController.getContents);

module.exports = router;
