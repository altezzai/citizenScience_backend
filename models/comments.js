"use strict";
const { DataTypes } = require("sequelize");
const sequelize = require("../config/connection");

const Comments = sequelize.define("Comments", {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER,
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
  comment: {
    type: DataTypes.STRING(200),
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
});

module.exports = Comments;

// static associate(models) {
//   Comments.hasMany(models.Notifications, { foreignKey: "commentId" });
// }
