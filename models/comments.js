"use strict";
const { DataTypes } = require("sequelize");
const sequelize = require("../config/connection");
const { FOREIGNKEYS } = require("sequelize/lib/query-types");
const FeedMentions = require("./feedmentions");

const Comments = sequelize.define("Comments", {
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
      model: "Users",
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
});

Comments.hasMany(Comments, { foreignKey: "parentId", as: "Replies" });
Comments.belongsTo(Comments, { foreignKey: "parentId" });

Comments.hasMany(Comments, { foreignKey: "parentId", as: "NestedReplies" });

Comments.hasMany(FeedMentions, { foreignKey: "commentId" });
FeedMentions.belongsTo(Comments, {
  foreignKey: "commentId",
});

module.exports = Comments;

// static associate(models) {
//   Comments.hasMany(models.Notifications, { foreignKey: "commentId" });
// }
