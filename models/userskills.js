"use strict";
const { Model, DataTypes } = require("sequelize");
const { skrollsSequelize } = require("../config/connection");

const UserSkills = skrollsSequelize.define(
  "UserSkills",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: "Users",
          schema: "repository",
        },
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    skillId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Skills",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
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
    modelName: "UserSkills",
    timestamps: true,
  }
);

module.exports = UserSkills;
