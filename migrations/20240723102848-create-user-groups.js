"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("UserGroups", {
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "UserS",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        primaryKey: true,
      },
      groupId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Groups",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        primaryKey: true,
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
    await queryInterface.addConstraint("UserGroups", {
      fields: ["userId", "groupId"],
      type: "unique",
      name: "unique_user_group",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint("UserGroups", "unique_user_group");
    await queryInterface.dropTable("UserGroups");
  },
};
