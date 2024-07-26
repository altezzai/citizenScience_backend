"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/connection");

const userCommunity = sequelize.define(
  "userCommunity",
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      primaryKey: true,
    },
    communityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Communities",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      primaryKey: true,
    },
    userType: {
      type: DataTypes.STRING(10),
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
    modelName: "userCommunity",
    timestamps: true,
  }
);

module.exports = userCommunity;
