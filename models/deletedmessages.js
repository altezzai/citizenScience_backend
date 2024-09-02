"use strict";
const { DataTypes } = require("sequelize");
const { skrollsSequelize } = require("../config/connection");

const DeletedMessages = skrollsSequelize.define(
  "DeletedMessages",
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
    deletedAt: {
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
    modelName: "DeletedMessages",
    timestamps: true,
  }
);

module.exports = DeletedMessages;
