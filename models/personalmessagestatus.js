"use strict";
const { Model, DataTypes } = require("DataTypes");
const DataTypes = require("../config/connection");

const PersonalMessageStatus = DataTypes.define(
  "PersonalMessageStatus",
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
        model: "PersonalMessages",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "cASCADE",
    },
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "cASCADE",
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
    modelName: "PersonalMessageStatus",
    timestamps: true,
  }
);

module.exports = PersonalMessageStatus;
// static associate(models) {
//   PersonalMessageStatus.belongsTo(models.PersonalMessages, {
//     foreignKey: "msgId",
//   });
//   PersonalMessageStatus.belongsTo(models.User, {
//     foreignKey: "recipientId",
//   });
// }
