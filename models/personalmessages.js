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
    }
  }
  PersonalMessages.init(
    {
      senderId: DataTypes.INTEGER,
      recipientId: DataTypes.INTEGER,
      message: DataTypes.STRING,
      isRead: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "PersonalMessages",
      timestamps: true,
    }
  );
  return PersonalMessages;
};
