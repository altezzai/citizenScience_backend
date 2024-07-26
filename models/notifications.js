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
    type: {
      type: DataTypes.STRING(10),
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
    actroId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    message: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
