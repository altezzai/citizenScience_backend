"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Comments extends Model {
    static associate(models) {
      Comments.belongsTo(models.Feed, { foreignKey: "feedId" });
      Comments.belongsTo(models.User, { foreignKey: "userId" });
      Comments.hasMany(models.Notifications, { foreignKey: "commentId" });
    }
  }
  Comments.init(
    {
      feedId: DataTypes.INTEGER,
      userId: DataTypes.INTEGER,
      comment: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Comments",
      timestamps: true,
    }
  );
  return Comments;
};
