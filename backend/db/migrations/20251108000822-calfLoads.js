'use strict';
const { calfLoadsSchema, CALFLOADS_TABLE } = require('../models/calfLoads.model');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(CALFLOADS_TABLE, { ...calfLoadsSchema });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("calfLoads")
  }
};
  