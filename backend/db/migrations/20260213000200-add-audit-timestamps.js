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
    allowNull: false,
    type: Sequelize.DATE,
    defaultValue: Sequelize.fn('NOW'),
  })
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const tableName of TABLES) {
      await ensureColumn(queryInterface, Sequelize, tableName, 'created_at')
      await ensureColumn(queryInterface, Sequelize, tableName, 'updated_at')
    }
  },

  down: async () => {
    // No-op to avoid destructive rollback.
  },
};

