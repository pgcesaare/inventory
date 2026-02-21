'use strict'

const CALVES_TABLE = 'calves'

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
    const definition = await getTableDefinition(queryInterface, CALVES_TABLE)
    if (!definition || definition.sell_status) return

    await queryInterface.addColumn(CALVES_TABLE, 'sell_status', {
      allowNull: false,
      type: Sequelize.STRING,
      defaultValue: 'open',
    })

    await queryInterface.sequelize.query(`
      UPDATE "${CALVES_TABLE}"
      SET "sell_status" = CASE
        WHEN LOWER(COALESCE("status", '')) = 'sold' THEN 'sold'
        ELSE 'open'
      END
    `)
  },

  down: async (queryInterface) => {
    const definition = await getTableDefinition(queryInterface, CALVES_TABLE)
    if (!definition) return

    if (definition.sell_status) {
      await queryInterface.removeColumn(CALVES_TABLE, 'sell_status')
    }
  },
}
