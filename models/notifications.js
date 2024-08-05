"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/connection");
const Notifications = sequelize.define(
  "Notifications",
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
    actorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    type: {
      type: DataTypes.ENUM,
      values: ["like", "comment", "follow", "mention", "reply", "custom"],
      allowNull: false,
    },
    content: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    feedId: {
      type: DataTypes.INTEGER,
      allowNull: true,
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

    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    actionURL: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM,
      values: ["High", "Medium", "Low"],
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
    modelName: "Notifications",
    timestamps: true,
  }
);

module.exports = Notifications;

// static associate(models) {
//   Notifications.belongsTo(models.User,{
//     foreignKey:'userId'
//   });
//   Notifications.belongsTo(models.User,{
//     foreignKey:'actorId'
//   });
//   Notifications.belongsTo(models.Feed,{
//     foreignKey:'feedId'
//   });
//   Notifications.belongsTo(models.Comment,{
//     foreignKey:'commentId'
//   });
// }
