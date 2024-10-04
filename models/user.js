"use strict";
const { Model, DataTypes } = require("sequelize");
const { repositorySequelize } = require("../config/connection");
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
const UserInterests = require("./userinterests");
const UserSkills = require("./userskills");
const Experience = require("./experience");
const Educations = require("./educations");
const OtherIds = require("./otherids");
const FeedViews = require("./feedviews");
const Reports = require("./reports");
const Actions = require("./actions");
const BlockedChats = require("./blockedchats");

const User = repositorySequelize.define(
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
    first_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    middle_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    biography: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    twitter: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    linkedin: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    facebook: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    github: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    profile_image: {
      type: DataTypes.STRING,
    },
    isAuthor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    citizenActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    citizenDeactivatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isBanned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    BannedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ban_duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    modelName: "User",
    timestamps: false,
  }
);

User.hasMany(Feed, {
  foreignKey: "userId",
  constraints: false,
  scope: { schema: "skrolls" },
});
Feed.belongsTo(User, {
  foreignKey: "userId",
  constraints: false,
  scope: { schema: "repository" },
});

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

User.hasMany(UserInterests, { foreignKey: "userId" });
UserInterests.belongsTo(User, { foreignKey: "userId" });

User.hasMany(UserSkills, { foreignKey: "userId" });
UserSkills.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Experience, { foreignKey: "userId" });
Experience.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Educations, { foreignKey: "userId" });
Educations.belongsTo(User, { foreignKey: "userId" });

User.hasMany(OtherIds, { foreignKey: "userId" });
OtherIds.belongsTo(User, { foreignKey: "userId" });

User.hasMany(FeedViews, { foreignKey: "userId" });
FeedViews.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Reports, { foreignKey: "reporter_id" });
Reports.belongsTo(User, { foreignKey: "reporter_id", as: "reporterUser" });

User.hasMany(Reports, { foreignKey: "userId" });
Reports.belongsTo(User, { foreignKey: "userId", as: "reportedUser" });

User.hasMany(Actions, { foreignKey: "userId" });
Actions.belongsTo(User, { foreignKey: "userId", as: "reportedUser" });

User.hasMany(Actions, { foreignKey: "reviewedBy" });
Actions.belongsTo(User, { foreignKey: "reviewedBy", as: "reviewer" });

User.hasMany(BlockedChats, { foreignKey: "blockedBy" });
BlockedChats.belongsTo(User, { foreignKey: "blockedBy", as: "blockedById" });

User.hasMany(BlockedChats, { foreignKey: "blockedUser" });
BlockedChats.belongsTo(User, { foreignKey: "blockedUser", as: "blockedId" });

module.exports = User;
