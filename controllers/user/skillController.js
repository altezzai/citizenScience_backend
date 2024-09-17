const { skrollsSequelize } = require("../../config/connection");
const Skills = require("../../models/skills");
const User = require("../../models/user");
const UserSkills = require("../../models/userskills");

const addSkills = async (req, res) => {
  const { userId } = req.params;
  const { skillList } = req.body;
  if (!Array.isArray(skillList) || skillList.some((skill) => skill === "")) {
    return res.status(400).json({
      error: "Invalid skill list. Must be an array of non-empty strings.",
    });
  }
  const transaction = await skrollsSequelize.transaction();

  try {
    for (let skill of skillList) {
      let [skillRecord, created] = await Skills.findOrCreate({
        where: { skill },
        defaults: { skill },
        transaction,
      });

      const userSkillExists = await UserSkills.findOne({
        where: {
          userId,
          skillId: skillRecord.id,
        },
        transaction,
      });

      if (!userSkillExists) {
        await UserSkills.create(
          {
            userId,
            skillId: skillRecord.id,
          },
          { transaction }
        );
      }
    }

    await transaction.commit();
    res.status(200).json({ message: "Skills added successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error("Error adding skills", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getUserSkills = async (req, res) => {
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

    const userSkills = await UserSkills.findAll({
      where: { userId },
      attributes: [],
      include: [
        {
          model: Skills,
          attributes: ["id", "skill"],
        },
      ],
    });
    res.status(200).json(userSkills);
  } catch (error) {
    console.error("Error fetching user skills", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateUserSkills = async (req, res) => {
  const { userId } = req.params;
  const { skillList } = req.body;

  if (!Array.isArray(skillList) || skillList.some((skill) => skill === "")) {
    return res.status(400).json({
      error: "Invalid skill list. Must be an array of non-empty strings.",
    });
  }

  const transaction = await skrollsSequelize.transaction();

  try {
    const existingUserSkills = await UserSkills.findAll({
      where: { userId },
      include: [{ model: Skills, attributes: ["skill"] }],
      transaction,
    });

    const existingSkills = existingUserSkills.map((us) => us.Skill.skill);

    for (let skill of skillList) {
      let [skillRecord, created] = await Skills.findOrCreate({
        where: { skill },
        defaults: { skill },
        transaction,
      });

      const userSkillExists = existingUserSkills.find(
        (us) => us.skillId === skillRecord.id
      );

      if (!userSkillExists) {
        await UserSkills.create(
          {
            userId,
            skillId: skillRecord.id,
          },
          { transaction }
        );
      }
    }

    const skillsToRemove = existingSkills.filter(
      (skill) => !skillList.includes(skill)
    );

    for (let skill of skillsToRemove) {
      const skillRecord = await Skills.findOne({
        where: { skill },
        transaction,
      });

      if (skillRecord) {
        await UserSkills.destroy({
          where: {
            userId,
            skillId: skillRecord.id,
          },
          transaction,
        });
      }
    }

    await transaction.commit();
    res.status(200).json({ message: "User skills updated successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating user skills", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  addSkills,
  getUserSkills,
  updateUserSkills,
};
