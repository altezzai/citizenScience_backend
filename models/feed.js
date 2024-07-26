"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/connection");

const Feed = sequelize.define(
  "Feed",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    fileName: {
      type: DataTypes.STRING(50),
    },
    link: {
      type: DataTypes.STRING(100),
    },
    description: {
      type: DataTypes.STRING(200),
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
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

module.exports = Feed;

// class Feed extends Model {
//   static associate(models) {
//     Feed.belongsTo(models.User, { foreignKey: "userId" });
//     Feed.belongsToMany(models.User, {
//       through: models.Like,
//       foreignKey: "feedId",
//     });
//     Feed.hasMany(models.Comments, { foreignKey: "feedId" });
//     Feed.hasMany(models.Notifications, { foreignKey: "feedId" });
//   }
// }
// Feed.init(
//   {
//     fileName: DataTypes.STRING,
//     link: DataTypes.STRING,
//     description: DataTypes.STRING,
//     userId: DataTypes.INTEGER,
//     likeCount: DataTypes.INTEGER,
//     commentCount: DataTypes.INTEGER,
//     shareCount: DataTypes.INTEGER,
//   },
//   {
//     sequelize,
//     modelName: "Feed",
//     timestamps: true,
//   }
// );
