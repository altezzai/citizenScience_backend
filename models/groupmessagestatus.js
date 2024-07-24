"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class GroupMessageStatus extends Model {
    static associate(models) {
      GroupMessageStatus.belongsTo(models.GroupMessages, {
        foreignKey: "msgId",
      });
      GroupMessageStatus.belongsTo(models.User, {
        foreignKey: "recipientId",
      });
    }
  }
  GroupMessageStatus.init(
    {
      msgId: DataTypes.INTEGER,
      recipientId: DataTypes.INTEGER,
      isReceived: DataTypes.BOOLEAN,
      isRead: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "GroupMessageStatus",
      timestamps: true,
    }
  );
  return GroupMessageStatus;
};
