const {
  skrollsSequelize,
  repositorySequelize,
} = require("../../config/connection");
const { Sequelize } = require("sequelize");
const Followers = require("../../models/followers");
const Notifications = require("../../models/notifications");
const User = require("../../models/user");
const { addNotification } = require("./notificationController");

const follow = async (req, res) => {
  const { followingId } = req.body;
  const followerId = req.user.id;

  if (!followerId || !followingId || followerId === followingId) {
    return res.status(400).json({ error: "Invalid followerId or followingId" });
  }

  const transaction = await skrollsSequelize.transaction();

  try {
    const user = await User.findOne({
      where: { id: followerId },
      attributes: ["isBanned"],
    });

    if (user.isBanned) {
      return res.status(403).json({ error: "User account is banned" });
    }
    const [relationship, created] = await Followers.findOrCreate({
      where: { followerId, followingId },
      transaction,
    });

    if (!created) {
      await relationship.destroy({ transaction });
      await Notifications.destroy({
        where: {
          userId: followingId,
          actorId: followerId,
          type: "follow",
        },
        transaction,
      });
      await transaction.commit();
      return res.status(200).json({ message: "Unfollowed successfully" });
    } else {
      await addNotification(
        followingId,
        followerId,
        "follow",
        "started following you",
        null,
        null,
        `/profile/${followerId}`,
        "Low",
        transaction
      );
      await transaction.commit();
      return res.status(200).json({ message: "Followed successfully" });
    }
  } catch (error) {
    await transaction.rollback();
    console.error("Error adding follower:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const followers = async (req, res) => {
  const followingId = parseInt(req.query.userId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  if (!followingId) {
    return res.status(400).json({ error: "followingId is required" });
  }

  try {
    const userId = req.user.id;

    const followersList = await Followers.findAll({
      offset,
      limit,
      where: { followingId },
      attributes: [
        "followerId",
        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN 'skrolls.user'
                ELSE username
              END
            FROM repository.Users
            WHERE repository.Users.id = Followers.followerId
          )`),
          "username",
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN 'skrolls.user'
                ELSE first_name
              END
            FROM repository.Users
            WHERE repository.Users.id = Followers.followerId
          )`),
          "first_name",
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN 'skrolls.user'
                ELSE middle_name
              END
            FROM repository.Users
            WHERE repository.Users.id = Followers.followerId
          )`),
          "middle_name",
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN 'skrolls.user'
                ELSE last_name
              END
            FROM repository.Users
            WHERE repository.Users.id = Followers.followerId
          )`),
          "last_name",
        ],

        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN NULL
                ELSE profile_image
              END
            FROM repository.Users
            WHERE repository.Users.id = Followers.followerId
          )`),
          "profilePhoto",
        ],
        [
          Sequelize.literal(`(
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM skrolls.Followers AS subFollowers
                WHERE subFollowers.followerId = ${userId}
                AND subFollowers.followingId = Followers.followerId
              )
              THEN 1
              ELSE 0
            END
          )`),
          "isFollowing",
        ],
      ],
      order: [
        [
          Sequelize.literal(
            `CASE WHEN followerId = ${userId} THEN 0 ELSE 1 END`
          ),
          "ASC",
        ],
        ["followerId", "ASC"],
      ],
    });

    // const followerList = followers.map(follow => follow.FollowerDetails);

    res.status(200).json(followersList);
  } catch (error) {
    console.error("Error retreiving followers", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const followings = async (req, res) => {
  const followerId = parseInt(req.query.userId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  if (!followerId) {
    return res.status(400).json({ error: "followerId is required" });
  }

  try {
    const userId = req.user.id;

    const followingsList = await Followers.findAll({
      offset,
      limit,
      where: { followerId },
      attributes: [
        "followingId",
        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN 'skrolls.user'
                ELSE username
              END
            FROM repository.Users
            WHERE repository.Users.id = Followers.followingId
          )`),
          "username",
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN 'skrolls.user'
                ELSE first_name
              END
            FROM repository.Users
            WHERE repository.Users.id = Followers.followingId
          )`),
          "first_name",
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN 'skrolls.user'
                ELSE middle_name
              END
            FROM repository.Users
            WHERE repository.Users.id = Followers.followingId
          )`),
          "middle_name",
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN 'skrolls.user'
                ELSE last_name
              END
            FROM repository.Users
            WHERE repository.Users.id = Followers.followingId
          )`),
          "last_name",
        ],

        [
          Sequelize.literal(`(
            SELECT 
              CASE
                WHEN (isActive = false OR citizenActive = false)
                THEN NULL
                ELSE profile_image
              END
            FROM repository.Users
            WHERE repository.Users.id = Followers.followingId
          )`),
          "profilePhoto",
        ],
        [
          Sequelize.literal(`(
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM skrolls.Followers AS subFollowers
                WHERE subFollowers.followerId = ${userId}
                AND subFollowers.followingId = Followers.followingId
              )
              THEN 1
              ELSE 0
            END
          )`),
          "isFollowing",
        ],
      ],
      order: [
        [
          Sequelize.literal(
            `CASE WHEN followingId = ${userId} THEN 0 ELSE 1 END`
          ),
          "ASC",
        ],
        ["followingId", "ASC"], // Secondary sort if needed
      ],
    });

    res.status(200).json(followingsList);
  } catch (error) {
    console.error("Error retrieving followings", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  follow,
  followers,
  followings,
};
