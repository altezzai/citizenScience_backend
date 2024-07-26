"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/connection");
const Feed = require("./feed");

const User = sequelize.define(
  "User",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    username: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    profilePhoto: {
      type: DataTypes.STRING,
    },
  },
  {
    modelName: "User",
    timestamps: false,
  }
);

User.hasMany(Feed, { foreignKey: "userId" });
Feed.belongsTo(User, { foreignKey: "userId" });

module.exports = User;

// class User extends Model {
//   static associate(models) {
//     User.hasMany(models.Feed, { foreignKey: "userId" });
//     User.belongsToMany(models.Feed, {
//       through: models.Like,
//       foreignKey: "userId",
//     });
//     User.hasMany(models.Comments, { foreignKey: "userId" });
//     User.belongsToMany(models.User, {
//       through: models.Followers,
//       foreignKey: "userId",
//       otherKey: "followerId",
//     }); //where a user can have many followers
//     User.belongsToMany(models.User, {
//       through: models.Followers,
//       foreignKey: "followerId",
//       otherKey: "userId",
//     }); // where a user can follow many other users.
//     User.belongsToMany(models.User, {
//       through: models.Followings,
//       foreignKey: "userId",
//       otherKey: "followingId",
//     }); //where each user can have multiple user followings
//     User.belongsToMany(models.Group, {
//       through: models.UserGroups,
//       foreignKey: "userId",
//       otherKey: "groupId",
//     });
//     User.belongsToMany(models.Communities, {
//       through: models.userCommunity,
//       foreignKey: "userId",
//     });
//     User.hasMany(models.Notifications, {
//       foreignKey: "userId",
//     });
//     User.hasMany(models.Notifications, {
//       foreignKey: "actorId",
//     });
//     User.hasMany(models.PersonalMessages, {
//       foreignKey: "senderId",
//     });
//     User.hasMany(models.PersonalMessages, {
//       foreignKey: "recipientId",
//     });
//     User.hasMany(models.GroupMessages, {
//       foreignKey: "senderId",
//     });
//   }
// }
// User.init(
//   {
//     username: DataTypes.STRING,
//     email: DataTypes.STRING,
//     password: DataTypes.STRING,
//     profilePhoto: DataTypes.STRING,
//   },
//   {
//     sequelize,
//     modelName: "User",
//     timestamps: false,
//   }
// );
