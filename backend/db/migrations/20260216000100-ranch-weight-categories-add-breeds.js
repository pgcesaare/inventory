'use strict';

const RANCH_WEIGHT_CATEGORIES_TABLE = 'ranch_weight_categories'

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
    if (!(await tableExists(queryInterface, RANCH_WEIGHT_CATEGORIES_TABLE))) return

    const definition = await getTableDefinition(queryInterface, RANCH_WEIGHT_CATEGORIES_TABLE)
    if (!definition || definition.breeds) return

    await queryInterface.addColumn(RANCH_WEIGHT_CATEGORIES_TABLE, 'breeds', {
      allowNull: false,
      type: Sequelize.ARRAY(Sequelize.STRING),
      defaultValue: [],
    })
  },

  down: async () => {
    // no-op to avoid destructive rollback
  }
}
