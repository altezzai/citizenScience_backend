"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/connection");

const Like = sequelize.define(
  "Like",
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
        model: "Users",
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
    commentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Comments",
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
    modelName: "Like",
    timestamps: true,
  }
);

module.exports = Like;
