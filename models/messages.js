"use strict";
const { DataTypes } = require("sequelize");
const { skrollsSequelize } = require("../config/connection");
const Chats = require("./chats");
const MessageStatuses = require("./messagestatuses");
const User = require("./user");
const DeletedMessages = require("./deletedmessages");
const Reports = require("./reports");
const Actions = require("./actions");

const Messages = skrollsSequelize.define(
  "Messages",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    chatId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Chats",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    senderId: {
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
    mediaUrl: {
      type: DataTypes.TEXT,
      get() {
        const rawValue = this.getDataValue("mediaUrl");
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue("mediaUrl", JSON.stringify(value));
      },
    },
    content: {
      type: DataTypes.TEXT,
    },
    messageType: {
      type: DataTypes.ENUM("regular", "system", "chatAction"),
      allowNull: false,
      defaultValue: "regular",
    },
    replyToId: {
      type: DataTypes.INTEGER,

      references: {
        model: "Messages",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    overallStatus: {
      type: DataTypes.ENUM("sent", "received", "read"),
      allowNull: false,
    },
    deleteForEveryone: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    sentAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    messageActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    modelName: "Messages",
    timestamps: true,
  }
);

Chats.hasMany(Messages, { foreignKey: "chatId" });
Messages.belongsTo(Chats, { foreignKey: "chatId" });

Messages.hasMany(Messages, { foreignKey: "replyToId" });
Messages.belongsTo(Messages, { foreignKey: "replyToId", as: "replyTo" });

Messages.hasMany(MessageStatuses, { foreignKey: "messageId" });
MessageStatuses.belongsTo(Messages, { foreignKey: "messageId" });

Messages.hasMany(DeletedMessages, { foreignKey: "messageId" });
DeletedMessages.belongsTo(Messages, { foreignKey: "messageId" });

Messages.hasMany(Reports, { foreignKey: "messageId" });
Reports.belongsTo(Messages, { foreignKey: "messageId" });

Messages.hasMany(Actions, { foreignKey: "messageId" });
Actions.belongsTo(Messages, { foreignKey: "messageId" });

module.exports = Messages;
