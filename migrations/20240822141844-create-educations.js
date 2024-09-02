"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Educations", {
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
      institution: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      course: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      startYear: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          isInt: true,
          len: [4, 4],
        },
      },
      endYear: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          len: [4, 4],
        },
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
      ALTER TABLE skrolls.Educations
      ADD CONSTRAINT fk_educations_userId
      FOREIGN KEY (userId)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.Educations
      DROP FOREIGN KEY fk_educations_userId;
    `);
    await queryInterface.dropTable("Educations");
  },
};
