"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Messages", {
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
      senderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      mediaUrl: {
        type: Sequelize.TEXT,
        get() {
          const rawValue = this.getDataValue("mediaUrl");
          return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
          this.setDataValue("mediaUrl", JSON.stringify(value));
        },
      },
      content: {
        type: Sequelize.TEXT,
      },
      messageType: {
        type: Sequelize.ENUM("regular", "system"),
        allowNull: false,
        defaultValue: "regular",
      },
      replyToId: {
        type: Sequelize.INTEGER,

        references: {
          model: "Messages",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      overallStatus: {
        type: Sequelize.ENUM("sent", "received", "read"),
        allowNull: false,
      },
      deleteForEveryone: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      sentAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      messageActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      ALTER TABLE skrolls.Messages
      ADD CONSTRAINT fk_messages_userId
      FOREIGN KEY (senderId)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.Messages
      DROP FOREIGN KEY fk_messages_userId;
    `);
    await queryInterface.dropTable("Messages");
  },
};
