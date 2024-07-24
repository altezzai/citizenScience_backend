"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Followings extends Model {
    static associate(models) {
      // define association here
    }
  }
  Followings.init(
    {
      userId: DataTypes.INTEGER,
      followingId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Followings",
      timestamps:true
    }
  );
  return Followings;
};
