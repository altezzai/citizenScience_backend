"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class GroupMessages extends Model {
    static associate(models) {
      GroupMessages.belongsTo(models.Groups, {
        foreignKey: "groupId",
      });
      GroupMessages.belongsTo(models.User, {
        foreignKey: "senderId",
      });

      GroupMessages.hasMany(models.GroupMessages, {
        foreignKey: "replyMessageId",
      });
    }
  }
  GroupMessages.init(
    {
      groupId: DataTypes.INTEGER,
      senderId: DataTypes.INTEGER,
      message: DataTypes.TEXT,
      replyMessageId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "GroupMessages",
    }
  );
  return GroupMessages;
};
