"use strict";
const { DataTypes } = require("sequelize");

const { skrollsSequelize } = require("../config/connection");

const CommunityHashtags = skrollsSequelize.define(
  "CommunityHashtags",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    chatId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Chats",
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
    modelName: "CommunityHashtags",
    timestamps: true,
  }
);

module.exports = CommunityHashtags;
