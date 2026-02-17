'use strict';

const CALF_LOADS_TABLE = 'calfLoads'
const COLUMN_NAME = 'days_on_feed_at_shipment'

const tableExists = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables()
  return tables.some((entry) => {
    if (typeof entry === 'string') return entry === tableName
    return entry?.tableName === tableName || entry?.table_name === tableName
  })
}

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
    if (!(await tableExists(queryInterface, CALF_LOADS_TABLE))) return
    const definition = await getTableDefinition(queryInterface, CALF_LOADS_TABLE)
    if (!definition || definition[COLUMN_NAME]) return

    await queryInterface.addColumn(CALF_LOADS_TABLE, COLUMN_NAME, {
      allowNull: true,
      type: Sequelize.INTEGER,
    })
  },

  down: async () => {
    // no-op to avoid destructive rollback
  }
}
