"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("DeletedMessages", {
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
      messageId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Messages",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      deletedAt: {
        allowNull: false,
        type: Sequelize.DATE,
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
      ALTER TABLE skrolls.DeletedMessages
      ADD CONSTRAINT fk_deletedmessages_userId
      FOREIGN KEY (userId)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
    await queryInterface.addConstraint("DeletedMessages", {
      fields: ["userId", "messageId"],
      type: "unique",
      name: "unique_delete_message",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.DeletedMessages
      DROP FOREIGN KEY fk_deletedmessages_userId;
    `);
    await queryInterface.removeConstraint(
      "DeletedMessages",
      "unique_delete_message"
    );

    await queryInterface.dropTable("DeletedMessages");
  },
};
