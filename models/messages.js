"use strict";
const { DataTypes } = require("sequelize");
const sequelize = require("../config/connection");

const Messages = sequelize.define(
  "Messages",
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
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    mediaUrl: {
      type: DataTypes.STRING,
    },
    content: {
      type: DataTypes.TEXT,
    },
    replyToId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Messages",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    sendAt: {
      allowNull: false,
      type: DataTypes.DATE,
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
    modelName: "Messages",
    timestamps: true,
  }
);

module.exports = Messages;
