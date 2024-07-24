"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class PersonalMessageStatus extends Model {
    static associate(models) {
      PersonalMessageStatus.belongsTo(models.PersonalMessages, {
        foreignKey: "msgId",
      });
      PersonalMessageStatus.belongsTo(models.User, {
        foreignKey: "recipientId",
      });
    }
  }
  PersonalMessageStatus.init(
    {
      msgId: DataTypes.INTEGER,
      recipientId: DataTypes.INTEGER,
      isReceived: DataTypes.BOOLEAN,
      isRead: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "PersonalMessageStatus",
      timestamps: true,
    }
  );
  return PersonalMessageStatus;
};
