"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("MessageStatuses", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      messageId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Messages",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("sent", "received", "read"),
        allowNull: false,
      },
      sentAt: {
        type: Sequelize.DATE,
      },
      receivedAt: {
        type: Sequelize.DATE,
      },
      readAt: {
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
      ALTER TABLE skrolls.MessageStatuses
      ADD CONSTRAINT fk_messagemtatuses_userId
      FOREIGN KEY (userId)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.MessageStatuses
      DROP FOREIGN KEY fk_messagemtatuses_userId;
    `);
    await queryInterface.dropTable("MessageStatuses");
  },
};
