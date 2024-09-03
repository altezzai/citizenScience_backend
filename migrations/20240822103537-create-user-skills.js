"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("UserSkills", {
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
      skillId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Skills",
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
      ALTER TABLE skrolls.UserSkills
      ADD CONSTRAINT fk_userskills_userId
      FOREIGN KEY (userId)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
    await queryInterface.addConstraint("UserSkills", {
      fields: ["userId", "skillId"],
      type: "unique",
      name: "unique_user_skills",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.UserSkills
      DROP FOREIGN KEY fk_userskills_userId;
    `);
    await queryInterface.removeConstraint("UserSkills", "unique_user_skills");
    await queryInterface.dropTable("UserSkills");
  },
};
