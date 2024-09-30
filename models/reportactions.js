"use strict";
const { Model, DataTypes } = require("sequelize");

const { skrollsSequelize } = require("../config/connection");

const ReportActions = skrollsSequelize.define(
  "ReportActions",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Reports",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    actionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Actions",
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
    modelName: "ReportActions",
    timestamps: true,
  }
);

module.exports = ReportActions;
