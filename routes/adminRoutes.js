const express = require("express");
const auth = require("../middleware/authMiddleware");

const feedEditingController = require("../controllers/admin/feedEditingController");
const contentManagementController = require("../controllers/admin/contentManagementController");
const contentModerationController = require("../controllers/admin/contentModerationController");

const router = express.Router();

router.get("/pendingFeeds", feedEditingController.getPendingFeeds);
router.get("/feedDetails/:id", feedEditingController.getFeedDetails);
router.get("/solvedFeeds", feedEditingController.getSolvedFeeds);

router.get("/contents", contentManagementController.getContents);

router.get("/getReports", contentModerationController.getReports);
router.get("/viewReport", contentModerationController.viewReport);

module.exports = router;
