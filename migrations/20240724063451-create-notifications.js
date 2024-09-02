"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Notifications", {
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
      actorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      type: {
        type: Sequelize.ENUM,
        values: ["like", "comment", "follow", "mention", "reply", "custom"],
        allowNull: false,
      },
      content: {
        type: Sequelize.STRING,
        allowNull: true,
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

      isRead: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      actionURL: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      priority: {
        type: Sequelize.ENUM,
        values: ["High", "Medium", "Low"],
        allowNull: false,
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
      ALTER TABLE skrolls.Notifications
      ADD CONSTRAINT fk_notifications_userId
      FOREIGN KEY (userId)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.Notifications
      ADD CONSTRAINT fk_actor_userId
      FOREIGN KEY (actorId)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.Notifications
      DROP FOREIGN KEY fk_notifications_userId;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.Notifications
      DROP FOREIGN KEY fk_actor_userId;
    `);
    await queryInterface.dropTable("Notifications");
  },
};
