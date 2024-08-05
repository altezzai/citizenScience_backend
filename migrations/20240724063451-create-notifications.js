"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Notifications", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
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
      actorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      type: {
        type: Sequelize.ENUM,
        values: ["like", "comment", "follow", "mention", "reply", "custom"],
        allowNull: false,
      },
      content: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      feedId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Feeds",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      commentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Comments",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      isRead: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      actionURL: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      priority: {
        type: Sequelize.ENUM,
        values: ["High", "Medium", "Low"],
        allowNull: false,
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
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Notifications");
  },
};
