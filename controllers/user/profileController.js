const {
  skrollsSequelize,
  repositorySequelize,
} = require("../../config/connection");
const { Sequelize, Op } = require("sequelize");
const User = require("../../models/user");
const Followers = require("../../models/followers");
const OtherIds = require("../../models/otherids");

const profileDetails = async (req, res) => {
  const userId = parseInt(req.query.userId);
  try {
    const user = await User.findOne({
      where: { id: userId },
      attributes: [
        "username",
        "profile_image",
        "first_name",
        "middle_name",
        "last_name",
        "biography",
        "facebook",
        "linkedin",
        "twitter",
        "website",
        "github",
        "isActive",
        "citizenActive",
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isActive || !user.citizenActive) {
      return res.status(403).json({ error: "User is not active" });
    }

    const [followersCount, followingCount] = await Promise.all([
      Followers.count({
        where: { followingId: userId },
        scope: { schema: "skrolls" },
      }),
      Followers.count({
        where: { followerId: userId },
        scope: { schema: "skrolls" },
      }),
    ]);

    const userProfile = {
      username: user.username,
      profilePhoto: user.profile_image,
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      biography: user.biography,
      facebook: user.facebook,
      linkedin: user.linkedin,
      twitter: user.twitter,
      website: user.website,
      github: user.github,
      followersCount,
      followingCount,
    };

    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Error fetching profile details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addOtherIds = async (req, res) => {
  const { userId } = req.params;
  const { name, link } = req.body;

  try {
    const newId = await OtherIds.create({
      userId,
      name,
      link,
    });
    res.status(200).json(newId);
  } catch (error) {
    console.error("Error adding Other Ids", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getOtherIds = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findOne({
      where: { id: userId },
      attributes: ["isActive", "citizenActive"],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.isActive || !user.citizenActive) {
      return res.status(403).json({ error: "User is not active" });
    }

    const otherids = await OtherIds.findAll({
      where: { userId },
      attributes: ["id", "name", "link"],
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json(otherids);
  } catch (error) {
    console.error("Error fetching otherids", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateOtherIds = async (req, res) => {
  const { id } = req.params;
  const { name, link } = req.body;

  try {
    const otherid = await OtherIds.findOne({ where: { id } });

    if (!otherid) {
      return res.status(404).json({ error: "OtherIds not found" });
    }

    await otherid.update({
      name,
      link,
    });

    res.status(200).json(otherid);
  } catch (error) {
    console.error("Error updating otherid", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteOtherIds = async (req, res) => {
  const { id } = req.params;
  try {
    await OtherIds.destroy({ where: { id } });
    res.status(200).json({ message: "OtherId deleted successfully" });
  } catch (error) {
    console.error("Error deleting OtherId", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  profileDetails,
  addOtherIds,
  getOtherIds,
  updateOtherIds,
  deleteOtherIds,
};
