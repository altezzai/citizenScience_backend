"use strict";
const { DataTypes } = require("sequelize");
const sequelize = require("../config/connection");

const PostHashtags = sequelize.define(
  "PostHashtags",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
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
    hashtagId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Hashtags",
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
    modelName: "PostHashtags",
    timestamps: true,
  }
);

module.exports = PostHashtags;
