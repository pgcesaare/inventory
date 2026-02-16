'use strict';

const OLD_TABLE = 'ranch_weight_categories'
const NEW_TABLE = 'weight_brackets'

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

const renameIndexIfExists = async (queryInterface, tableName, fromName, toName) => {
  try {
    const indexes = await queryInterface.showIndex(tableName)
    const hasFrom = Array.isArray(indexes) && indexes.some((item) => item?.name === fromName)
    const hasTo = Array.isArray(indexes) && indexes.some((item) => item?.name === toName)
    if (hasFrom && !hasTo) {
      await queryInterface.renameIndex(tableName, fromName, toName)
    }
  } catch (error) {
    // no-op to keep migration resilient across environments
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hasOld = await tableExists(queryInterface, OLD_TABLE)
    const hasNew = await tableExists(queryInterface, NEW_TABLE)

    if (hasOld && !hasNew) {
      await queryInterface.renameTable(OLD_TABLE, NEW_TABLE)
    }

    if (await tableExists(queryInterface, NEW_TABLE)) {
      await renameIndexIfExists(
        queryInterface,
        NEW_TABLE,
        'ranch_weight_categories_ranch_id_idx',
        'weight_brackets_ranch_id_idx'
      )

      const definition = await getTableDefinition(queryInterface, NEW_TABLE)
      if (definition && !definition.breeds) {
        await queryInterface.addColumn(NEW_TABLE, 'breeds', {
          allowNull: false,
          type: Sequelize.ARRAY(Sequelize.STRING),
          defaultValue: [],
        })
      }
    }
  },

  down: async () => {
    // no-op to avoid destructive rollback
  }
}
