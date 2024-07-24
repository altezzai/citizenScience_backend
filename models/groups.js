"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Groups extends Model {
    static associate(models) {
      Groups.belongsToMany(models.User, {
        through: models.UserGroup,
        foreignKey: "groupId",
        otherKey: "userId",
      });
      Groups.hasMany(models.GroupMessages, {
        foreignKey: groupId,
      });
    }
  }
  Groups.init(
    {
      groupName: DataTypes.STRING,
      profilePhoto: DataTypes.STRING,
      creatorId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Groups",
      timestamps: true,
    }
  );
  return Groups;
};
