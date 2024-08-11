"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/connection");

const Communities = sequelize.define(
  "Communities",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    communityName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    profilePhoto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    creatorId: {
      type: DataTypes.INTEGER,
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
    modelName: "Communities",
    timestamps: true,
  }
);

module.exports = Communities;
