"use strict";
const { DataTypes } = require("sequelize");
const sequelize = require("../config/connection");
const UserSkills = require("./userskills");

const Skills = sequelize.define(
  "Skills",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    skill: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
  },
  {
    modelName: "Skills",
    timestamps: true,
  }
);

Skills.hasMany(UserSkills, { foreignKey: "skillId" });
UserSkills.belongsTo(Skills, { foreignKey: "skillId" });

module.exports = Skills;
