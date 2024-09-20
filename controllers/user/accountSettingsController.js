const { where } = require("sequelize");
const {
  skrollsSequelize,
  repositorySequelize,
} = require("../../config/connection");
const User = require("../../models/user");

const deactivateAccount = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId);
    if (user.isBanned) {
      return res.status(403).json({ error: "User account is banned" });
    }

    if (!user.citizenActive) {
      return res.status(409).json({ error: "Account is already deactivated" });
    }
    await user.update({
      citizenActive: false,
      citizenDeactivatedAt: new Date(),
    });

    res.status(200).json({ message: "Account deactivated" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteAccount = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId);
    if (user.isBanned) {
      return res.status(403).json({ error: "User account is banned" });
    }

    if (!user.isActive) {
      return res.status(409).json({ error: "Account is already deleted" });
    }
    await user.update({
      isActive: false,
      deletedAt: new Date(),
    });

    res.status(200).json({ message: "Account deleted" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  deactivateAccount,
  deleteAccount,
};
