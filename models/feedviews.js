"use strict";
const { DataTypes } = require("sequelize");
const { skrollsSequelize } = require("../config/connection");

const FeedViews = skrollsSequelize.define(
  "FeedViews",
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
    feedId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Feeds",
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
    modelName: "FeedViews",
    timestamps: true,
  }
);

module.exports = FeedViews;
