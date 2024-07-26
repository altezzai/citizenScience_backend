"use strict";
const { Model, DataTypes } = require("DataTypes");
const DataTypes = require("../config/connection");
const sequelize = require("../config/connection");

const PersonalMessages = sequelize.define(
  "PersonalMessages",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
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
    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    replyMessageId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "PersonalMessages",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
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
    modelName: "PersonalMessages",
    timestamps: true,
  }
);

module.exports = PersonalMessages;

// static associate(models) {
//   PersonalMessages.belongsTo(models.User, {
//     foreignKey: "senderId",
//   });
//   PersonalMessages.belongsTo(models.User, {
//     foreignKey: "recipientId",
//   });
//   PersonalMessages.hasMany(models.PersonalMessages, {
//     foreignKey: "replyMessageId",
//   });
//   PersonalMessages.hasOne(models.PersonalMessageStatus, {
//     foreignKey: "msgId",
//   });
// }
