"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class PersonalMessages extends Model {
    static associate(models) {
      PersonalMessages.belongsTo(models.User, {
        foreignKey: "senderId",
      });
      PersonalMessages.belongsTo(models.User, {
        foreignKey: "recipientId",
      });
      PersonalMessages.hasMany(models.PersonalMessages, {
        foreignKey: "replyMessageId",
      });
      PersonalMessages.hasOne(models.PersonalMessageStatus, {
        foreignKey: "msgId",
      });
    }
  }
  PersonalMessages.init(
    {
      senderId: DataTypes.INTEGER,
      recipientId: DataTypes.INTEGER,
      message: DataTypes.STRING,
      replyMessageId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "PersonalMessages",
      timestamps: true,
    }
  );
  return PersonalMessages;
};
