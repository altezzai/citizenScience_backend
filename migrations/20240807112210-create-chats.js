"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Chats", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      type: {
        type: Sequelize.ENUM("personal", "group", "community"),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      icon: {
        type: Sequelize.STRING,
      },
      description: {
        type: Sequelize.STRING(150),
        allowNull: true,
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
      ALTER TABLE skrolls.Chats
      ADD CONSTRAINT fk_chats_userId
      FOREIGN KEY (createdBy)
      REFERENCES repository.Users(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
    `);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.Chats
      DROP FOREIGN KEY fk_chats_userId;
    `);
    await queryInterface.dropTable("Chats");
  },
};
