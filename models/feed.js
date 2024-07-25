"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/connection");

class Feed extends Model {
  static associate(models) {
    Feed.belongsTo(models.User, { foreignKey: "userId" });
    Feed.belongsToMany(models.User, {
      through: models.Like,
      foreignKey: "feedId",
    });
    Feed.hasMany(models.Comments, { foreignKey: "feedId" });
    Feed.hasMany(models.Notifications, { foreignKey: "feedId" });
  }
}
Feed.init(
  {
    fileName: DataTypes.STRING,
    link: DataTypes.STRING,
    description: DataTypes.STRING,
    userId: DataTypes.INTEGER,
    likeCount: DataTypes.INTEGER,
    commentCount: DataTypes.INTEGER,
    shareCount: DataTypes.INTEGER,
  },
  {
    sequelize,
    modelName: "Feed",
    timestamps: true,
  }
);

module.exports = Feed;
