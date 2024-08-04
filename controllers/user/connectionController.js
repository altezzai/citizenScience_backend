const sequelize = require("../../config/connection");
const Followers = require("../../models/followers");
const Followings = require("../../models/followings");
const User = require("../../models/user");

const follow = async (req, res) => {
  const { userId, followerId } = req.body;

  if (!userId || !followerId || userId === followerId) {
    return res.status(400).json({ error: "Invalid userId or followerId" });
  }

  const transaction = await sequelize.transaction();

  try {
    const existingFollower = await Followers.findOne({
      where: {
        userId: userId,
        followerId: followerId,
      },
      transaction,
    });

    if (existingFollower) {
      await Followers.destroy({
        where: {
          userId: userId,
          followerId: followerId,
        },
        transaction,
      });
      await transaction.commit();
      return res.status(200).json({ message: "Follower removed" });
    } else {
      await Followers.create(
        {
          userId: userId,
          followerId: followerId,
        },
        { transaction }
      );
      await transaction.commit();
      return res.status(200).json({ message: "Follower added" });
    }
  } catch (error) {
    await transaction.rollback();
    console.error("Error adding follower:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const followers = async (req, res) => {
  const userId = parseInt(req.query.userId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const followersList = await Followers.findAll({
      offset,
      limit,
      where: { userId },
      attributes: [],
      include: [
        {
          model: User,
          as: "FollowerDetails",
          attributes: ["id", "username", "profilePhoto"],
        },
      ],
    });

    // const followerList = followers.map(follow => follow.FollowerDetails);

    res.status(200).json(followersList);
  } catch (error) {
    console.error("Error retreiving followers", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const following = async (req, res) => {
  const { userId, followingId } = req.body;

  if (!userId || !followingId || userId === followingId) {
    return res.status(404).json({ error: "Invalid userId or FollowingId" });
  }
  const transaction = await sequelize.transaction();
  try {
    const existingFollowing = await Followings.findOne({
      where: {
        userId,
        followingId,
      },
      transaction,
    });
    if (existingFollowing) {
      await Followings.destroy({
        where: {
          userId,
          followingId,
        },
        transaction,
      });
      await transaction.commit();
      return res.status(200).json({ message: "Following removed" });
    } else {
      await Followings.create(
        {
          userId,
          followingId,
        },
        { transaction }
      );
      await transaction.commit();
      return res.status(200).json({ message: "Following added" });
    }
  } catch (error) {
    await transaction.rollback();
    console.error("Error adding following:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const followings = async (req, res) => {
  const userId = parseInt(req.query.userId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const followersList = await Followings.findAll({
      offset,
      limit,
      where: { userId },
      attributes: [],
      include: [
        {
          model: User,
          as: "FollowingDetails",
          attributes: ["id", "username", "profilePhoto"],
        },
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
  following,
  followings,
};
