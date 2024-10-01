"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Reports", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      reporter_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      feedId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Feeds",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      userId: {
        type: Sequelize.INTEGER,
      },
      commentId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Comments",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      messageId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Messages",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      reason: {
        type: Sequelize.ENUM,
        values: ["spam", "violence", "hate_speech", "other"],
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.ENUM,
        values: ["pending", "resolved"],
        allowNull: false,
        defaultValue: "pending",
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
      ALTER TABLE skrolls.Reports
      ADD CONSTRAINT fk_reports_reporter_id
      FOREIGN KEY (reporter_id)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.Reports
      ADD CONSTRAINT fk_reports_userId
      FOREIGN KEY (userId)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.Reports
      DROP FOREIGN KEY fk_reports_reporter_id;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.Reports
      DROP FOREIGN KEY fk_reports_userId;
    `);
    await queryInterface.dropTable("Reports");
  },
};
