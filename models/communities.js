'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Communities extends Model {
   
    static associate(models) {
      Communities.belongsToMany(models.User,{
        through: models.userCommunity,
        foreignKey:'communityId'
      });
    }
  }
  Communities.init({
    communityName: DataTypes.STRING,
    profilePhoto: DataTypes.STRING,
    creatorId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Communities',
    timestamps:true
  });
  return Communities;
};