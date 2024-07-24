'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('userCommunities', {
     
      userId: {
        type: Sequelize.INTEGER,
        allowNull:false,
        references: {
          model:'Users',
          key: 'id'
        },
        onDelete:'CASCADE',
        onUpdate:'CASCADE',
        primaryKey:true
      },
      communityId: {
        type: Sequelize.INTEGER,
        allowNull:false,
        references: {
          model:'Communities',
          key: 'id'
        },
        onDelete:'CASCADE',
        onUpdate:'CASCADE',
        primaryKey:true
      },
      userType: {
        type: Sequelize.STRING(10),
        allowNull:false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
    await queryInterface.addConstraint('userCommunities',{
      fields: ['userId','communityId'],
      type:'unique',
      name:'unique_user_community'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('userCommunities','unique_user_community');
    await queryInterface.dropTable('userCommunities');
  }
};