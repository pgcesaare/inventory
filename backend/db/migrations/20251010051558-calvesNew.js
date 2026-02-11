'use strict';
const { CalvesSchema, CALVES_TABLE } = require('../models/calves.model');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(CALVES_TABLE, { ...CalvesSchema });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("calves")
  }
};
  