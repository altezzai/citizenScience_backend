const { Sequelize } = require("sequelize");
const {
  skrollsSequelize,
  repositorySequelize,
} = require("../../config/connection");
const Interests = require("../../models/interests");
const UserInterests = require("../../models/userinterests");
const User = require("../../models/user");

const addInterest = async (req, res) => {
  const { userId } = req.params;
  const { interestList } = req.body;
  if (
    !Array.isArray(interestList) ||
    interestList.some((interest) => interest === "")
  ) {
    return res.status(400).json({
      error: "Invalid interest list. Must be an array of non-empty strings.",
    });
  }
  const transaction = await skrollsSequelize.transaction();

  try {
    for (let interest of interestList) {
      let [interestRecord, created] = await Interests.findOrCreate({
        where: { interest },
        defaults: { interest },
        transaction,
      });

      const userInterestExists = await UserInterests.findOne({
        where: {
          userId,
          interestId: interestRecord.id,
        },
        transaction,
      });

      if (!userInterestExists) {
        await UserInterests.create(
          {
            userId,
            interestId: interestRecord.id,
          },
          { transaction }
        );
      }
    }

    await transaction.commit();
    res.status(200).json({ message: "Successful" });
  } catch (error) {
    await transaction.rollback();
    console.error("Error adding interest", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getUserInterests = async (req, res) => {
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
    const userInterests = await UserInterests.findAll({
      where: { userId },
      attributes: [],
      include: [
        {
          model: Interests,
          attributes: ["id", "interest"],
        },
      ],
    });
    res.status(200).json(userInterests);
  } catch (error) {
    console.error("Error fetching user interests", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateUserInterests = async (req, res) => {
  const { userId } = req.params;
  const { interestList } = req.body;

  if (
    !Array.isArray(interestList) ||
    interestList.some((interest) => interest === "")
  ) {
    return res.status(400).json({
      error: "Invalid interest list. Must be an array of non-empty strings.",
    });
  }

  const transaction = await skrollsSequelize.transaction();

  try {
    const existingUserInterests = await UserInterests.findAll({
      where: { userId },
      include: [{ model: Interests, attributes: ["interest"] }],
      transaction,
    });

    const existingInterests = existingUserInterests.map(
      (ui) => ui.Interest.interest
    );

    for (let interest of interestList) {
      let [interestRecord, created] = await Interests.findOrCreate({
        where: { interest },
        defaults: { interest },
        transaction,
      });

      const userInterestExists = existingUserInterests.find(
        (ui) => ui.interestId === interestRecord.id
      );

      if (!userInterestExists) {
        await UserInterests.create(
          {
            userId,
            interestId: interestRecord.id,
          },
          { transaction }
        );
      }
    }

    const interestsToRemove = existingInterests.filter(
      (interest) => !interestList.includes(interest)
    );

    for (let interest of interestsToRemove) {
      const interestRecord = await Interests.findOne({
        where: { interest },
        transaction,
      });

      if (interestRecord) {
        await UserInterests.destroy({
          where: {
            userId,
            interestId: interestRecord.id,
          },
          transaction,
        });
      }
    }

    await transaction.commit();
    res.status(200).json({ message: "User interests updated successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating user interests", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  addInterest,
  getUserInterests,
  updateUserInterests,
};
