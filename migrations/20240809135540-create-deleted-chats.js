"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("DeletedChats", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
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
      deletedAt: {
        allowNull: false,
        type: Sequelize.DATE,
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
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.DeletedChats
      ADD CONSTRAINT fk_deletedchats_userId
      FOREIGN KEY (userId)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
    await queryInterface.addConstraint("DeletedChats", {
      fields: ["userId", "chatId"],
      type: "unique",
      name: "unique_delete_chat",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.DeletedChats
      DROP FOREIGN KEY fk_deletedchats_userId;
    `);
    await queryInterface.removeConstraint("DeletedChats", "unique_delete_chat");

    await queryInterface.dropTable("DeletedChats");
  },
};
