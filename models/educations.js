"use strict";
const { Model, DataTypes } = require("sequelize");
const { skrollsSequelize } = require("../config/connection");

const Educations = skrollsSequelize.define(
  "Educations",
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
    institution: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    course: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    startYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        len: [4, 4],
      },
    },
    endYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        len: [4, 4],
      },
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
    modelName: "Educations",
    timestamps: true,
  }
);
module.exports = Educations;
