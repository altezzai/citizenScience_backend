'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Notifications extends Model {
   
    static associate(models) {
      Notifications.belongsTo(models.User,{
        foreignKey:'userId'
      });
      Notifications.belongsTo(models.User,{
        foreignKey:'actorId'
      });
      Notifications.belongsTo(models.Feed,{
        foreignKey:'feedId'
      });
      Notifications.belongsTo(models.Comment,{
        foreignKey:'commentId'
      });
    }
  }
  Notifications.init({
    userId: DataTypes.INTEGER,
    type: DataTypes.STRING,
    feedId: DataTypes.INTEGER,
    commentId: DataTypes.INTEGER,
    actroId: DataTypes.INTEGER,
    message: DataTypes.STRING,
    isRead: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Notifications',
    timestamps:true,
  });
  return Notifications;
};