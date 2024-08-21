const { where, Op, Model } = require("sequelize");
const sequelize = require("../../config/connection");
const User = require("../../models/user");
const Followers = require("../../models/followers");
const ChatMembers = require("../../models/chatmembers");

const searchMembers = async (req, res) => {
  const { chatId } = req.params;
  const userId = parseInt(req.query.userId);
  const searchItem = req.query.q;

  try {
    const followers = await Followers.findAll({
      where: {
        followerId: userId,
      },
      attributes: ["followingId"],
    });

    const followerIds = followers.map((follower) => follower.followingId);

    const users = await User.findAll({
      where: {
        id: {
          [Op.in]: followerIds,
        },
        username: {
          [Op.like]: `%${searchItem}%`,
        },
      },
      attributes: ["id", "username", "profilePhoto"],
    });

    const userIds = users.map((user) => user.id);

    const chatMembers = await ChatMembers.findAll({
      where: {
        chatId: chatId,
        userId: {
          [Op.in]: userIds,
        },
      },
      attributes: ["userId"],
    });

    const chatMemberIds = chatMembers.map((member) => member.userId);

    const filteredUsers = users.filter(
      (user) => !chatMemberIds.includes(user.id)
    );
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in searching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  searchMembers,
};
