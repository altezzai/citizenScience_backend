"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CommunityHashtags", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      chatId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Chats",
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
    await queryInterface.addConstraint("CommunityHashtags", {
      fields: ["chatId", "hashtagId"],
      type: "unique",
      name: "unique_community_hashtags",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint(
      "CommunityHashtags",
      "unique_community_hashtags"
    );
    await queryInterface.dropTable("CommunityHashtags");
  },
};
