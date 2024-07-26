"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/connection");

const GroupMessageStatus = sequelize.define(
  "GroupMessageStatus",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    msgId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "GroupMessages",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    isReceived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    modelName: "GroupMessageStatus",
    timestamps: true,
  }
);

module.exports = GroupMessageStatus;

// static associate(models) {
//   GroupMessageStatus.belongsTo(models.GroupMessages, {
//     foreignKey: "msgId",
//   });
//   GroupMessageStatus.belongsTo(models.User, {
//     foreignKey: "recipientId",
//   });
// }
