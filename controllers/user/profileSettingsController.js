const {
  skrollsSequelize,
  repositorySequelize,
} = require("../../config/connection");
const User = require("../../models/user");

const registerAsAuthor = async (req, res) => {
  const id = parseInt(req.query.userId);
  const isAuthor = req.query.isAuthor;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
    }

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
