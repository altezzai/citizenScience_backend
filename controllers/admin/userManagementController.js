const { repositorySequelize } = require("../../config/connection");
const User = require("../../models/user");

const getUserDetails = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const isActive = JSON.parse(req.query.active) || false;
  console.log(isActive);

  try {
    const { count, rows: users } = await User.findAndCountAll({
      limit,
      offset,
      attributes: ["username", "first_name", "last_name", "profile_image"],
      where: {
        isActive,
      },
    });
    const totalPages = Math.ceil(count.length / limit);
    res.status(200).json({
      totalUsers: count,
      totalPages,
      currentPage: page,
      users,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getUserDetails,
};
