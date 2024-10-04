"use strict";
const { DataTypes, Model } = require("sequelize");
const { skrollsSequelize } = require("../config/connection");
const ChatMembers = require("./chatmembers");
const DeletedChats = require("./deletedchats");
const CommunityFeeds = require("./communityfeeds");
const CommunityHashtags = require("./communityhashtags");
const BlockedChats = require("./blockedchats");

const Chats = skrollsSequelize.define(
  "Chats",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    type: {
      type: DataTypes.ENUM("personal", "group", "community"),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: "Users",
          schema: "repository",
        },
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    icon: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.STRING(150),
      allowNull: true,
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
    modelName: "Chats",
    timeStamps: true,
  }
);

Chats.hasMany(ChatMembers, { foreignKey: "chatId" });
ChatMembers.belongsTo(Chats, { foreignKey: "chatId" });

Chats.hasMany(DeletedChats, { foreignKey: "chatId" });
DeletedChats.belongsTo(Chats, { foreignKey: "chatId" });

Chats.hasMany(CommunityFeeds, { foreignKey: "chatId" });
CommunityFeeds.belongsTo(Chats, { foreignKey: "chatId" });

Chats.hasMany(CommunityHashtags, { foreignKey: "chatId" });
CommunityHashtags.belongsTo(Chats, { foreignKey: "chatId" });

Chats.hasMany(BlockedChats, { foreignKey: "chatId" });
BlockedChats.belongsTo(Chats, { foreignKey: "chatId" });

module.exports = Chats;
