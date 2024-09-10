"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("FeedViews", {
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
      ALTER TABLE skrolls.FeedViews
      ADD CONSTRAINT fk_FeedViews_userId
      FOREIGN KEY (userId)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
    await queryInterface.addConstraint("FeedViews", {
      fields: ["userId", "feedId"],
      type: "unique",
      name: "unique_viewed_feeds",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.FeedViews
      DROP FOREIGN KEY fk_FeedViews_userId;
    `);
    await queryInterface.removeConstraint("FeedViews", "unique_viewed_feeds");
    await queryInterface.dropTable("FeedViews");
  },
};
