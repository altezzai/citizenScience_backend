"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class UserGroups extends Model {
    static associate(models) {
      // define association here
    }
  }
  UserGroups.init(
    {
      userId: DataTypes.INTEGER,
      groupId: DataTypes.INTEGER,
      userType: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "UserGroups",
      timestamps: true,
    }
  );
  return UserGroups;
};
