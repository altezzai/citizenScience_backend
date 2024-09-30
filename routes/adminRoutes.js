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

router.get("/pendingReports", contentModerationController.getPendingReports);
router.get("/rejectedReports", contentModerationController.getRejectedReports);
router.get("/resolvedReports", contentModerationController.getResolvedReports);

module.exports = router;
