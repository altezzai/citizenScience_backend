const { skrollsSequelize } = require("../../config/connection");
const Experience = require("../../models/experience");
const User = require("../../models/user");

const addExperience = async (req, res) => {
  const { workspace, position, startDate, endDate } = req.body;
  if (
    !workspace ||
    !position ||
    !startDate ||
    workspace.trim() === "" ||
    position.trim() === "" ||
    startDate.trim() === ""
  ) {
    return res.status(400).json({
      error: "'workspace', 'position', and 'startDate' are required fields.",
    });
  }

  try {
    const userId = req.user.id;
    // const user = await User.findOne({
    //   where: { id: userId },
    //   attributes: ["isBanned"],
    // });

    // if (user.isBanned) {
    //   return res.status(403).json({ error: "User account is banned" });
    // }
    const validatedEndDate = endDate && endDate.trim() !== "" ? endDate : null;

    const newExperience = await Experience.create({
      userId,
      workspace,
      position,
      startDate,
      endDate: validatedEndDate,
    });
    res.status(200).json(newExperience);
  } catch (error) {
    console.error("Error adding Experience", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getExperiences = async (req, res) => {
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

    const experiences = await Experience.findAll({
      where: { userId },
      attributes: ["id", "workspace", "position", "startDate", "endDate"],
      order: [["startDate", "DESC"]],
    });
    res.status(200).json(experiences);
  } catch (error) {
    console.error("Error fetching experience", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateExperience = async (req, res) => {
  const { id } = req.params;
  const { workspace, position, startDate, endDate } = req.body;
  if (
    (!workspace || workspace.trim() === "") &&
    (!position || position.trim() === "") &&
    (!startDate || startDate.trim() === "") &&
    (!endDate || endDate.trim() === "")
  ) {
    return res.status(400).json({
      error:
        "At least one of 'workspace', 'position', 'startDate' or 'endDate' is required.",
    });
  }

  try {
    const userId = req.user.id;
    // const user = await User.findOne({
    //   where: { id: userId },
    //   attributes: ["isBanned"],
    // });

    // if (user.isBanned) {
    //   return res.status(403).json({ error: "User account is banned" });
    // }

    const experience = await Experience.findOne({ where: { id, userId } });

    if (!experience) {
      return res.status(404).json({ error: "Experience not found" });
    }

    await experience.update({
      workspace,
      position,
      startDate,
      endDate,
    });

    res.status(200).json(experience);
  } catch (error) {
    console.error("Error updating Experience", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteExperience = async (req, res) => {
  const { id } = req.params;
  try {
    const userId = req.user.id;
    // const user = await User.findOne({
    //   where: { id: userId },
    //   attributes: ["isBanned"],
    // });

    // if (user.isBanned) {
    //   return res.status(403).json({ error: "User account is banned" });
    // }
    const experience = await Experience.findOne({
      where: { id, userId },
    });

    if (!experience) {
      return res.status(404).json({ error: "Experience not found" });
    }
    await Experience.destroy({ where: { id, userId } });
    res.status(200).json({ message: "Experience deleted successfully" });
  } catch (error) {
    console.error("Error deleting Experience", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  addExperience,
  getExperiences,
  updateExperience,
  deleteExperience,
};
