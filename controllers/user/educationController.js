const { skrollsSequelize } = require("../../config/connection");
const Educations = require("../../models/educations");

const addEducation = async (req, res) => {
  const { userId } = req.params;
  const { institution, course, startYear, endYear } = req.body;

  try {
    const newEducation = await Educations.create({
      userId,
      institution,
      course,
      startYear,
      endYear,
    });
    res.status(200).json(newEducation);
  } catch (error) {
    console.error("Error adding Experience", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getEducations = async (req, res) => {
  const { userId } = req.params;
  try {
    const educations = await Educations.findAll({
      where: { userId },
      attributes: ["id", "institution", "course", "startYear", "endYear"],
      order: [["startYear", "DESC"]],
    });
    res.status(200).json(educations);
  } catch (error) {
    console.error("Error fetching educations", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateEducation = async (req, res) => {
  const { id } = req.params;
  const { institution, course, startYear, endYear } = req.body;

  try {
    const education = await Educations.findOne({ where: { id } });

    if (!education) {
      return res.status(404).json({ error: "education not found" });
    }

    await education.update({
      institution,
      course,
      startYear,
      endYear,
    });

    res.status(200).json(education);
  } catch (error) {
    console.error("Error updating education", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteEducation = async (req, res) => {
  const { id } = req.params;
  try {
    await Educations.destroy({ where: { id } });
    res.status(200).json({ message: "Education deleted successfully" });
  } catch (error) {
    console.error("Error deleting education", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  addEducation,
  getEducations,
  updateEducation,
  deleteEducation,
};
