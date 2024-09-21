const {
  skrollsSequelize,
  repositorySequelize,
} = require("../../config/connection");
const User = require("../../models/user");

const registerAsAuthor = async (req, res) => {
  const userId = req.user.id;
  const isAuthor = req.query.isAuthor;

  try {
    const user = await User.findByPk(userId);
    // if (user.isBanned) {
    //   return res.status(403).json({ error: "User account is banned" });
    // }

    await user.update({ isAuthor });
    res.status(200).json({ message: "updated isAuthor:" + isAuthor });
  } catch (error) {
    console.error("error updating isAuthor", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  registerAsAuthor,
};
