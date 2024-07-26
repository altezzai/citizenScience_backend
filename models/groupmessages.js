"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/connection");

const GroupMessages = sequelize.define(
  "GroupMessages",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Groups",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    senderId: {
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
      type: DataTypes.TEXT,
      allowNull: false,
    },
    replyMessageId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "GroupMessages",
        key: "id",
      },
      onDelete: "SET NULL",
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
    modelName: "GroupMessages",
    timestamps: true,
  }
);

module.exports = GroupMessages;

// static associate(models) {
//   GroupMessages.belongsTo(models.Groups, {
//     foreignKey: "groupId",
//   });
//   GroupMessages.belongsTo(models.User, {
//     foreignKey: "senderId",
//   });

//   GroupMessages.hasMany(models.GroupMessages, {
//     foreignKey: "replyMessageId",
//   });
//   GroupMessages.hasMany(models.GroupMessageStatus, {
//     foreignKey: "msgId",
//   });
// }
