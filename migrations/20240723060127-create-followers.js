"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Followers", {
      followerId: {
        type: Sequelize.INTEGER,
        allowNull: false,

        primaryKey: true,
      },
      followingId: {
        type: Sequelize.INTEGER,
        allowNull: false,

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
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.Followers
      ADD CONSTRAINT fk_follower_userId
      FOREIGN KEY (followerId)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.Followers
      ADD CONSTRAINT fk_following_userId
      FOREIGN KEY (followingId)
      REFERENCES repository.Users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    `);
    await queryInterface.addConstraint("Followers", {
      fields: ["followerId", "followingId"],
      type: "unique",
      name: "unique_follower_following",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.Followers
      DROP FOREIGN KEY fk_follower_userId;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE skrolls.Followers
      DROP FOREIGN KEY fk_following_userId;
    `);
    await queryInterface.removeConstraint(
      "Followers",
      "unique_follower_following"
    );
    await queryInterface.dropTable("Followers");
  },
};
