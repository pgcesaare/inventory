'use strict';

const TABLES = ['ranches', 'loads', 'calves']

const getTableDefinition = async (queryInterface, tableName) => {
  try {
    return await queryInterface.describeTable(tableName)
  } catch (error) {
    return null
  }
}

const ensureColumn = async (queryInterface, Sequelize, tableName, columnName) => {
  const definition = await getTableDefinition(queryInterface, tableName)
  if (!definition || definition[columnName]) return

  await queryInterface.addColumn(tableName, columnName, {
    allowNull: true,
    type: Sequelize.STRING,
  })
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const tableName of TABLES) {
      await ensureColumn(queryInterface, Sequelize, tableName, 'created_by')
    }
  },

  down: async () => {
    // No-op to avoid destructive rollback.
  },
};
