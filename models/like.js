'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Like extends Model {
    
    static associate(models) {
      // define association here
    }
  }
  Like.init({
    feedId: DataTypes.INTEGER,
    userId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Like',
    timestamps:true
  });
  return Like;
};