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
const CommunityFeeds = require("./communityfeeds");
const FeedViews = require("./feedviews");
const Reports = require("./reports");
const Actions = require("./actions");

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
    simplified_description: {
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
    editPermission: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isAdminEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    showSimplified: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    feedActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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

Feed.hasMany(CommunityFeeds, { foreignKey: "feedId" });
CommunityFeeds.belongsTo(Feed, { foreignKey: "feedId" });

Feed.hasMany(FeedViews, { foreignKey: "feedId" });
FeedViews.belongsTo(Feed, { foreignKey: "feedId" });

Feed.hasMany(Reports, { foreignKey: "feedId" });
Reports.belongsTo(Feed, { foreignKey: "feedId" });

Feed.hasMany(Actions, { foreignKey: "feedId" });
Actions.belongsTo(Feed, { foreignKey: "feedId" });

module.exports = Feed;
