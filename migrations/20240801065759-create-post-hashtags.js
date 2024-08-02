"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("PostHashtags", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
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
      hashtagId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Hashtags",
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

    await queryInterface.addConstraint("PostHashtags", {
      fields: ["feedId", "hashtagId"],
      type: "unique",
      name: "unique_hashtags",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint("PostHashtags", "unique_hashtags");
    await queryInterface.dropTable("PostHashtags");
  },
};
