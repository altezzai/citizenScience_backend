"use strict";
const { DataTypes } = require("sequelize");
const {skrollsSequelize} = require("../config/connection");
const PostHashtags = require("./posthashtags");

const Hashtags = skrollsSequelize.define(
  "Hashtags",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    hashtag: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    usageCount: {
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
    modelName: "Hashtags",
    timestamps: true,
  }
);

Hashtags.hasMany(PostHashtags, { foreignKey: "hashtagId" });
PostHashtags.belongsTo(Hashtags, { foreignKey: "hashtagId" });

module.exports = Hashtags;
