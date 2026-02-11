'use strict';
const { LOADS_TABLE, LoadsSchema } = require('../models/loads');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(LOADS_TABLE, { ...LoadsSchema });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("loads")
  }
};
