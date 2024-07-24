"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Feed, { foreignKey: "userId" });
      User.belongsToMany(models.Feed, {
        through: models.Like,
        foreignKey: "userId",
      });
      User.hasMany(models.Comments, { foreignKey: "userId" });
      User.belongsToMany(models.User, {
        through: models.Followers,
        foreignKey: "userId",
        otherKey: "followerId",
      }); //where a user can have many followers
      User.belongsToMany(models.User, {
        through: models.Followers,
        foreignKey: "followerId",
        otherKey: "userId",
      }); // where a user can follow many other users.
      User.belongsToMany(models.User, {
        through: models.Followings,
        foreignKey: "userId",
        otherKey: "followingId",
      }); //where each user can have multiple user followings
      User.belongsToMany(models.Group, {
        through: models.UserGroups,
        foreignKey: "userId",
        otherKey: "groupId",
      });
      User.belongsToMany(models.Communities, {
        through: models.userCommunity,
        foreignKey: "userId",
      });
      User.hasMany(models.Notifications, {
        foreignKey: "userId",
      });
      User.hasMany(models.Notifications, {
        foreignKey: "actorId",
      });
    }
  }
  User.init(
    {
      username: DataTypes.STRING,
      email: DataTypes.STRING,
      password: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "User",
      timestamps: false,
    }
  );
  return User;
};
