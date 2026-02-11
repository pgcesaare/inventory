'use strict';
const { RANCHES_TABLE , RanchesSchema } = require('../models/ranches');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(RANCHES_TABLE, { ...RanchesSchema });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("ranches")
  }
};
