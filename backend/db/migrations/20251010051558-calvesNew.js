'use strict';
const { CalvesSchema, CALVES_TABLE } = require('../models/calves.model');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Exclude virtual/computed fields from physical table creation
    const {
      backTag,
      dateIn,
      purchasePrice,
      daysOnFeed,
      ...physicalColumns
    } = CalvesSchema

    await queryInterface.createTable(CALVES_TABLE, { ...physicalColumns });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("calves")
  }
};
  
