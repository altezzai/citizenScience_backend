"use strict";
const { DataTypes } = require("sequelize");
const { skrollsSequelize } = require("../config/connection");
const { FOREIGNKEYS } = require("sequelize/lib/query-types");
const FeedMentions = require("./feedmentions");
const Notifications = require("./notifications");
const Like = require("./like");

const Comments = skrollsSequelize.define(
  "Comments",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    feedId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Feeds",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
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
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    comment: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Comments",
        key: "id",
      },
    },
    commentActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    likeCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    modelName: "Comments",
    timestamps: true,
  }
);

Comments.hasMany(Like, { foreignKey: "commentId" });
Like.belongsTo(Comments, { foreignKey: "commentId" });

Comments.hasMany(Comments, { foreignKey: "parentId", as: "Replies" });
Comments.belongsTo(Comments, { foreignKey: "parentId" });

Comments.hasMany(Comments, { foreignKey: "parentId", as: "NestedReplies" });

Comments.hasMany(FeedMentions, { foreignKey: "commentId" });
FeedMentions.belongsTo(Comments, {
  foreignKey: "commentId",
});

Comments.hasMany(Notifications, { foreignKey: "commentId" });
Notifications.belongsTo(Comments, { foreignKey: "commentId" });

module.exports = Comments;
