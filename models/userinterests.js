"use strict";
const { DataTypes } = require("sequelize");
const sequelize = require("../config/connection");

const UserInterests = sequelize.define(
  "UserInterests",
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
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    interestId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Interests",
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
    modelName: "UserInterests",
    timestamps: true,
  }
);

module.exports = UserInterests;
