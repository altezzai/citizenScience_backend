"use strict";
const { Model, DataTypes } = require("sequelize");
const { skrollsSequelize } = require("../config/connection");
const User = require("./user");

const Followers = skrollsSequelize.define(
  "Followers",
  {
    followerId: {
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
      primaryKey: true,
    },
    followingId: {
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
      primaryKey: true,
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
    modelName: "Followers",
    timestamps: true,
  }
);

module.exports = Followers;
