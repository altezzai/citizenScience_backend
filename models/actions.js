"use strict";
const { Model, DataTypes } = require("sequelize");
const { skrollsSequelize } = require("../config/connection");
const ReportActions = require("./reportactions");

const Actions = skrollsSequelize.define(
  "Actions",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    userId: {
      type: DataTypes.INTEGER,
      unique: true,
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
      unique: true,
      references: {
        model: "Feeds",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    commentId: {
      type: DataTypes.INTEGER,
      unique: true,
      references: {
        model: "Comments",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    messageId: {
      type: DataTypes.INTEGER,
      unique: true,
      references: {
        model: "Messages",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    action_types: {
      type: DataTypes.ENUM,
      values: ["warning", "content_removal", "account_suspension", "no_action"],
      allowNull: false,
    },
    reviewedBy: {
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
    resolvedAt: {
      type: DataTypes.DATE,
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
    modelName: "Actions",
    timestamps: true,
  }
);

Actions.hasMany(ReportActions, { foreignKey: "actionId" });
ReportActions.belongsTo(Actions, { foreignKey: "actionId" });

module.exports = Actions;
