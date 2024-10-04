"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("BlockedChats", {
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
      blockedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      blockedUser: {
        type: Sequelize.INTEGER,
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

    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.BlockedChats
      ADD CONSTRAINT fk_BlockedChats_blockedBy
      FOREIGN KEY (blockedBy)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.BlockedChats
      ADD CONSTRAINT fk_BlockedChats_blockedUser
      FOREIGN KEY (blockedUser)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("BlockedChats");
  },
};
