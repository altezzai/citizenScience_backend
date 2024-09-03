"use strict";
const { Model, DataTypes } = require("sequelize");
const {skrollsSequelize} = require("../config/connection");
const UserInterests = require("./userinterests");

const Interests = skrollsSequelize.define(
  "Interests",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    interest: {
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
    modelName: "Interests",
    timestamps: true,
  }
);

Interests.hasMany(UserInterests, { foreignKey: "interestId" });
UserInterests.belongsTo(Interests, { foreignKey: "interestId" });

module.exports = Interests;
