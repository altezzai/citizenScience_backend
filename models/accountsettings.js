"use strict";
const { Model, DataTypes } = require("sequelize");

const { skrollsSequelize } = require("../config/connection");

const AccountSettings = skrollsSequelize.define(
  "AccountSettings",
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
    },
    isDeactivated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isBlocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    deactivatedAt: {
      type: DataTypes.DATE,
    },
    deletedAt: {
      type: DataTypes.DATE,
    },
    blockedAt: {
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
  { modelName: "AccountSettings", timestamps: true }
);
