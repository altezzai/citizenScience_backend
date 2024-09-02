"use strict";
const { Model, DataTypes } = require("sequelize");
const { skrollsSequelize } = require("../config/connection");
const Comments = require("./comments");
const Like = require("./like");
const FeedMentions = require("./feedmentions");
const SavedFeeds = require("./savedfeeds");
const PostHashtags = require("./posthashtags");
const Hashtags = require("./hashtags");
const Notifications = require("./notifications");

const Feed = skrollsSequelize.define(
  "Feed",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    fileName: {
      type: DataTypes.TEXT,
      get() {
        const rawValue = this.getDataValue("fileName");
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue("fileName", JSON.stringify(value));
      },
    },
    link: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.TEXT,
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
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    likeCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    commentCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    shareCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    savedCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    viewsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    modelName: "Feed",
    timestamps: true,
  }
);
Feed.hasMany(Comments, { foreignKey: "feedId" });
Comments.belongsTo(Feed, { foreignKey: "feedId" });

Feed.hasMany(FeedMentions, { foreignKey: "feedId" });
FeedMentions.belongsTo(Feed, { foreignKey: "feedId" });

Feed.hasMany(SavedFeeds, { foreignKey: "feedId" });
SavedFeeds.belongsTo(Feed, { foreignKey: "feedId" });

Feed.hasMany(PostHashtags, { foreignKey: "feedId" });
PostHashtags.belongsTo(Feed, { foreignKey: "feedId" });

Feed.hasMany(Like, { foreignKey: "feedId" });
Like.belongsTo(Feed, { foreignKey: "feedId" });

Feed.hasMany(Notifications, { foreignKey: "feedId" });
Notifications.belongsTo(Feed, { foreignKey: "feedId" });

module.exports = Feed;
