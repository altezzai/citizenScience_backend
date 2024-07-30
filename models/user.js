"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/connection");
const Feed = require("./feed");
const Like = require("./like");
const Comments = require("./comments");

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

User.hasMany(Like, { foreignKey: "userId" });
Like.belongsTo(User, { foreignKey: "userId" });
User.belongsToMany(Feed, {
  through: Like,
  foreignKey: "userId",
});
Feed.belongsToMany(User, {
  through: Like,
  foreignKey: "feedId",
});

User.hasMany(Comments, { foreignKey: "userId", as: "Comments" });
Comments.belongsTo(User, { foreignKey: "userId", as: "CommentUser" });
User.hasMany(Comments, { foreignKey: "userId", as: "NestedReplies" });
Comments.belongsTo(User, { foreignKey: "userId", as: "ReplyUser" });
Comments.belongsTo(User, { foreignKey: "userId", as: "NestedReplyUser" });

module.exports = User;

// class User extends Model {
//   static associate(models) {

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
