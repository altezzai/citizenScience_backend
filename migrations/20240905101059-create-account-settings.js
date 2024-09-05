"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("AccountSettings", {
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
      isDeactivated: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isDeleted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isBlocked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      deactivatedAt: {
        type: Sequelize.DATE,
      },
      deletedAt: {
        type: Sequelize.DATE,
      },
      blockedAt: {
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
      ALTER TABLE skrolls.AccountSettings
      ADD CONSTRAINT fk_accountsettings_userId
      FOREIGN KEY (userId)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.AccountSettings
      DROP FOREIGN KEY fk_accountsettings_userId;
    `);
    await queryInterface.dropTable("AccountSettings");
  },
};
