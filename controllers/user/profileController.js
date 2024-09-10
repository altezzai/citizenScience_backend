const {
  skrollsSequelize,
  repositorySequelize,
} = require("../../config/connection");
const { Sequelize, Op } = require("sequelize");
const User = require("../../models/user");
const Followers = require("../../models/followers");

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
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
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

module.exports = {
  profileDetails,
};
