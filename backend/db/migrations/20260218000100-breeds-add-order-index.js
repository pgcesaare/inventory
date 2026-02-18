'use strict';

const BREEDS_TABLE = 'breeds'

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
    const hasTable = await tableExists(queryInterface, BREEDS_TABLE)
    if (!hasTable) return

    const definition = await getTableDefinition(queryInterface, BREEDS_TABLE)
    if (!definition) return

    if (!definition.order_index) {
      await queryInterface.addColumn(BREEDS_TABLE, 'order_index', {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 0,
      })
    }

    const [rows] = await queryInterface.sequelize.query(
      `SELECT id FROM ${BREEDS_TABLE} ORDER BY LOWER(name) ASC, id ASC`
    )

    if (Array.isArray(rows) && rows.length > 0) {
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index]
        await queryInterface.bulkUpdate(
          BREEDS_TABLE,
          { order_index: index },
          { id: Number(row.id) }
        )
      }
    }
  },

  down: async () => {
    // no-op to avoid destructive rollback
  }
}
