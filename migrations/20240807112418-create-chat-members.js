"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ChatMembers", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      chatId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Chats",
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
      isAdmin: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
    await queryInterface.addConstraint("ChatMembers", {
      fields: ["chatId", "userId"],
      type: "unique",
      name: "unique_chat_members",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint("ChatMembers", "unique_chat_members");
    await queryInterface.dropTable("ChatMembers");
  },
};
