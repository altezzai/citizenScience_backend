"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("UserInterests", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      interestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Interests",
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
    await queryInterface.addConstraint("UserInterests", {
      fields: ["userId", "interestId"],
      type: "unique",
      name: "unique_user_interest",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint(
      "UserInterests",
      "unique_user_interest"
    );
    await queryInterface.dropTable("UserInterests");
  },
};
