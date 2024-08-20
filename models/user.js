"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/connection");
const Feed = require("./feed");
const Like = require("./like");
const Comments = require("./comments");
const FeedMentions = require("./feedmentions");
const SavedFeeds = require("./savedfeeds");
const Followers = require("./followers");
const Notifications = require("./notifications");
const Messages = require("./messages");
const Chats = require("./chats");
const ChatMembers = require("./chatmembers");
const MessageStatuses = require("./messagestatuses");
const DeletedMessages = require("./deletedmessages");
const DeletedChats = require("./deletedchats");

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

User.hasMany(FeedMentions, { foreignKey: "userId" });
FeedMentions.belongsTo(User, { foreignKey: "userId" });

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

User.hasMany(SavedFeeds, { foreignKey: "userId" });
SavedFeeds.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Comments, { foreignKey: "userId", as: "Comments" });
Comments.belongsTo(User, { foreignKey: "userId", as: "CommentUser" });
// User.hasMany(Comments, { foreignKey: "userId", as: "NestedReplies" });
Comments.belongsTo(User, { foreignKey: "userId", as: "ReplyUser" });
// Comments.belongsTo(User, { foreignKey: "userId", as: "NestedReplyUser" });

User.hasMany(Followers, { foreignKey: "followerId", as: "Followers" });
Followers.belongsTo(User, { foreignKey: "followerId", as: "FollowerDetails" });
User.hasMany(Followers, { foreignKey: "followingId", as: "Following" });
Followers.belongsTo(User, {
  foreignKey: "followingId",
  as: "FollowingDetails",
});

User.hasMany(Notifications, {
  foreignKey: "userId",
  as: "ReceivedNotifications",
});

Notifications.belongsTo(User, { foreignKey: "userId", as: "Receipient" });

User.hasMany(Notifications, {
  foreignKey: "actorId",
  as: "TriggeredNotifications",
});

Notifications.belongsTo(User, { foreignKey: "actorId", as: "Actor" });

User.hasMany(Messages, { foreignKey: "senderId" });
Messages.belongsTo(User, { foreignKey: "senderId", as: "sender" });

// User.belongsToMany(Chats, { through: ChatMembers });

User.hasMany(Chats, { foreignKey: "createdBy" });
Chats.belongsTo(User, { foreignKey: "createdBy" });

User.hasMany(MessageStatuses, { foreignKey: "userId" });
MessageStatuses.belongsTo(User, { foreignKey: "userId" });

User.hasMany(ChatMembers, { foreignKey: "userId" });
ChatMembers.belongsTo(User, { foreignKey: "userId" });

User.hasMany(DeletedMessages, { foreignKey: "userId" });
DeletedMessages.belongsTo(User, { foreignKey: "userId" });

User.hasMany(DeletedChats, { foreignKey: "userId" });
DeletedChats.belongsTo(User, { foreignKey: "userId" });

module.exports = User;
