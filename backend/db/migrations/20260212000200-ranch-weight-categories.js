'use strict';

const RANCHES_TABLE = 'ranches'

const getTableDefinition = async (queryInterface, tableName) => {
  try {
    return await queryInterface.describeTable(tableName)
  } catch (error) {
    return null
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const definition = await getTableDefinition(queryInterface, RANCHES_TABLE)
    if (!definition || definition.weight_categories) return

    await queryInterface.addColumn(RANCHES_TABLE, 'weight_categories', {
      allowNull: true,
      type: Sequelize.JSON,
    })
  },

  down: async () => {
    // no-op to avoid destructive rollback
  }
};
