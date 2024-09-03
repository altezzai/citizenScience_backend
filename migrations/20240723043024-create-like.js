"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Likes", {
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
        allowNull: true,
        references: {
          model: "Feeds",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      commentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Comments",
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
      ALTER TABLE skrolls.Likes
      ADD CONSTRAINT fk_likes_userId
      FOREIGN KEY (userId)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
    await queryInterface.addConstraint("Likes", {
      fields: ["userId", "feedId", "commentId"],
      type: "unique",
      name: "unique_post_user_like",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.Likes
      DROP FOREIGN KEY fk_likes_userId;
    `);
    await queryInterface.removeConstraint("Likes", "unique_post_user_like");
    await queryInterface.dropTable("Likes");
  },
};
