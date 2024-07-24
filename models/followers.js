'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Followers extends Model {
   
    static associate(models) {
      // define association here
    }
  }
  Followers.init({
    userId: DataTypes.INTEGER,
    followerId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Followers',
    timestamps:true
  });
  return Followers;
};