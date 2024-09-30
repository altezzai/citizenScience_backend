"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ReportActions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      reportId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Reports",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      actionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Actions",
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

    await queryInterface.addConstraint("ReportActions", {
      fields: ["reportId", "actionId"],
      type: "unique",
      name: "unique_report_actions",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint(
      "ReportActions",
      "unique_report_actions"
    );
    await queryInterface.dropTable("ReportActions");
  },
};
