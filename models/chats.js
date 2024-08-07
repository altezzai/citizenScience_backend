"use strict";
const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/connection");

const Chats = sequelize.define(
  "Chats",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    type: {
      type: DataTypes.ENUM("personal", "group", "community"),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    icon: {
      type: DataTypes.STRING,
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
    modelName: "Chats",
    timeStamps: true,
  }
);

module.exports = Chats;
