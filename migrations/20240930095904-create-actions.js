"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Actions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      userId: {
        type: Sequelize.INTEGER,
        unique: true,
      },
      feedId: {
        type: Sequelize.INTEGER,
        unique: true,
        references: {
          model: "Feeds",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      commentId: {
        type: Sequelize.INTEGER,
        unique: true,
        references: {
          model: "Comments",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      messageId: {
        type: Sequelize.INTEGER,
        unique: true,
        references: {
          model: "Messages",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      action_types: {
        type: Sequelize.ENUM,
        values: [
          "warning",
          "content_removal",
          "account_suspension",
          "no_action",
        ],
        allowNull: false,
      },
      reviewedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      resolvedAt: {
        type: Sequelize.DATE,
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
      ALTER TABLE skrolls.Actions
      ADD CONSTRAINT fk_actions_userId
      FOREIGN KEY (userId)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.Actions
      ADD CONSTRAINT fk_actions_reviewedBy
      FOREIGN KEY (reviewedBy)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.Actions
      DROP FOREIGN KEY fk_actions_userId;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.Actions
      DROP FOREIGN KEY fk_actions_reviewedBy;
    `);
    await queryInterface.dropTable("Actions");
  },
};
