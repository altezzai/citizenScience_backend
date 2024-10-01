"use strict";
const { Model, DataTypes } = require("sequelize");

const { skrollsSequelize } = require("../config/connection");
const ReportActions = require("./reportactions");

const Reports = skrollsSequelize.define(
  "Reports",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    reporter_id: {
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
      references: {
        model: "Feeds",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    userId: {
      type: DataTypes.INTEGER,
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
    commentId: {
      type: DataTypes.INTEGER,
      references: {
        model: "Comments",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    messageId: {
      type: DataTypes.INTEGER,
      references: {
        model: "Messages",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    reason: {
      type: DataTypes.ENUM,
      values: ["spam", "violence", "hate_speech", "other"],
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.ENUM,
      values: ["pending", "resolved"],
      allowNull: false,
      defaultValue: "pending",
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
    modelName: "Reports",
    timestamps: true,
  }
);

Reports.hasMany(ReportActions, { foreignKey: "reportId" });
ReportActions.belongsTo(Reports, { foreignKey: "reportId" });

module.exports = Reports;
