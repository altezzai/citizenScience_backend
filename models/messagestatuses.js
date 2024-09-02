"use strict";
const { DataTypes } = require("sequelize");
const { skrollsSequelize } = require("../config/connection");

const MessageStatuses = skrollsSequelize.define(
  "MessageStatuses",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    messageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Messages",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
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
    status: {
      type: DataTypes.ENUM("sent", "received", "read"),
      allowNull: false,
    },
    sentAt: {
      type: DataTypes.DATE,
    },
    receivedAt: {
      type: DataTypes.DATE,
    },
    readAt: {
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
    modelName: "MessageStatuses",
    timestamps: true,
  }
);

module.exports = MessageStatuses;
