"use strict";

const { toDefaultValue } = require("sequelize/lib/utils");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("PersonalMessages", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      senderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      recipientId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      message: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      replyMessageId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "PersonalMessages",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

    await queryInterface.createTable("PersonalMessageStatus", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      msgId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "PersonalMessages",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "cASCADE",
      },
      recipientId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "cASCADE",
      },
      isReceived: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      isRead: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
    await queryInterface.addConstraint("PersonalMessageStatus", {
      fields: ["msgId", "recipientId"],
      type: "unique",
      name: "unique_personal_message_user_status",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint(
      "PersonalMessageStatus",
      "unique_personal_message_user_status"
    );
    await queryInterface.dropTable("PersonalMessages");
    await queryInterface.dropTable("PersonalMessageStatus");
  },
};
