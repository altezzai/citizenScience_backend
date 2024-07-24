"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Likes", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      feedId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Feeds",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addConstraint("Likes", {
      fields: ["feedId", "userId"],
      type: "unique",
      name: "unique_post_user_like",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint("Likes", "unique_post_user_like");
    await queryInterface.dropTable("Likes");
  },
};
