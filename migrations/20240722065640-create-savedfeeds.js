"use strict";

const { query } = require("express");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("SavedFeeds", {
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
      feedId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Feeds",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
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
      ALTER TABLE skrolls.SavedFeeds
      ADD CONSTRAINT fk_savedfeeds_userId
      FOREIGN KEY (userId)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);

    await queryInterface.addConstraint("SavedFeeds", {
      fields: ["userId", "feedId"],
      type: "unique",
      name: "unique_saved_feeds",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.SavedFeeds
      DROP FOREIGN KEY fk_savedfeeds_userId;
    `);
    await queryInterface.removeConstraint("SavedFeeds", "unique_saved_feeds");

    await queryInterface.dropTable("SavedFeeds");
  },
};
