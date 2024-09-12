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
  const { followerId, followingId } = req.body;

  if (!followerId || !followingId || followerId === followingId) {
    return res.status(400).json({ error: "Invalid followerId or followingId" });
  }

  const transaction = await skrollsSequelize.transaction();

  try {
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
  const userId = parseInt(req.query.currentUserId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  if (!followingId) {
    return res.status(400).json({ error: "followingId is required" });
  }

  try {
    const followersList = await Followers.findAll({
      offset,
      limit,
      where: { followingId },
      attributes: [
        "followerId",
        [
          Sequelize.literal(`(
            SELECT username
            FROM repository.Users AS users
            WHERE users.id = Followers.followerId
          )`),
          "username",
        ],
        [
          Sequelize.literal(`(
            SELECT first_name
            FROM repository.Users AS users
            WHERE users.id = Followers.followerId
          )`),
          "first_name",
        ],
        [
          Sequelize.literal(`(
            SELECT middle_name
            FROM repository.Users AS users
            WHERE users.id = Followers.followerId
          )`),
          "middle_name",
        ],
        [
          Sequelize.literal(`(
            SELECT last_name
            FROM repository.Users AS users
            WHERE users.id = Followers.followerId
          )`),
          "last_name",
        ],

        [
          Sequelize.literal(`(
            SELECT profile_image
            FROM repository.Users AS users
            WHERE users.id = Followers.followerId
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
  const userId = parseInt(req.query.currentUserId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  if (!followerId) {
    return res.status(400).json({ error: "followerId is required" });
  }

  try {
    const followersList = await Followers.findAll({
      offset,
      limit,
      where: { followerId },
      attributes: [
        "followingId",
        [
          Sequelize.literal(`(
            SELECT username
            FROM repository.Users AS users
            WHERE users.id = Followers.followingId
          )`),
          "username",
        ],
        [
          Sequelize.literal(`(
            SELECT first_name
            FROM repository.Users AS users
            WHERE users.id = Followers.followerId
          )`),
          "first_name",
        ],
        [
          Sequelize.literal(`(
            SELECT middle_name
            FROM repository.Users AS users
            WHERE users.id = Followers.followerId
          )`),
          "middle_name",
        ],
        [
          Sequelize.literal(`(
            SELECT last_name
            FROM repository.Users AS users
            WHERE users.id = Followers.followerId
          )`),
          "last_name",
        ],
        [
          Sequelize.literal(`(
            SELECT profile_image
            FROM repository.Users AS users
            WHERE users.id = Followers.followingId
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
    });

    res.status(200).json(followersList);
  } catch (error) {
    console.error("Error retreiving followings", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  follow,
  followers,
  followings,
};
