"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class userCommunity extends Model {
    static associate(models) {
      // define association here
    }
  }
  userCommunity.init(
    {
      userId: DataTypes.INTEGER,
      communityId: DataTypes.INTEGER,
      userType: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "userCommunity",
      timestamps: true,
    }
  );
  return userCommunity;
};
