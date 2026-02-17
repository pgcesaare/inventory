'use strict';

const RANCH_PRICE_PERIODS_TABLE = 'ranch_price_periods'

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
    const hasTable = await tableExists(queryInterface, RANCH_PRICE_PERIODS_TABLE)
    if (!hasTable) return

    const definition = await getTableDefinition(queryInterface, RANCH_PRICE_PERIODS_TABLE)
    if (!definition) return

    if (!definition.layout_mode) {
      await queryInterface.addColumn(RANCH_PRICE_PERIODS_TABLE, 'layout_mode', {
        allowNull: false,
        type: Sequelize.STRING,
        defaultValue: 'single',
      })
    }

    if (!definition.sheet_data) {
      await queryInterface.addColumn(RANCH_PRICE_PERIODS_TABLE, 'sheet_data', {
        allowNull: false,
        type: Sequelize.JSONB,
        defaultValue: {},
      })
    }
  },

  down: async () => {
    // no-op to avoid destructive rollback
  }
}
