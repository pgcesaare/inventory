'use strict';

const RANCHES_TABLE = 'ranches'
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

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hasRanches = await tableExists(queryInterface, RANCHES_TABLE)
    if (!hasRanches) return

    const hasWeightCategoryTable = await tableExists(queryInterface, RANCH_WEIGHT_CATEGORIES_TABLE)
    if (!hasWeightCategoryTable) {
      await queryInterface.createTable(RANCH_WEIGHT_CATEGORIES_TABLE, {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        ranch_id: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: RANCHES_TABLE,
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        category_key: {
          allowNull: true,
          type: Sequelize.STRING,
        },
        min_weight: {
          allowNull: true,
          type: Sequelize.DECIMAL(10, 2),
        },
        max_weight: {
          allowNull: true,
          type: Sequelize.DECIMAL(10, 2),
        },
        label: {
          allowNull: false,
          type: Sequelize.STRING,
        },
        description: {
          allowNull: true,
          type: Sequelize.STRING,
        },
        order_index: {
          allowNull: false,
          type: Sequelize.INTEGER,
          defaultValue: 0,
        },
      })
      await queryInterface.addIndex(RANCH_WEIGHT_CATEGORIES_TABLE, ['ranch_id'], { name: 'ranch_weight_categories_ranch_id_idx' })
    }

    const ranchesDefinition = await getTableDefinition(queryInterface, RANCHES_TABLE)
    if (!ranchesDefinition?.weight_categories) return

    const ranchRows = await queryInterface.sequelize.query(
      `SELECT id, weight_categories FROM ${RANCHES_TABLE} WHERE weight_categories IS NOT NULL`,
      { type: Sequelize.QueryTypes.SELECT }
    )

    const inserts = []
    ranchRows.forEach((row) => {
      const ranchId = Number(row.id)
      if (!Number.isFinite(ranchId)) return

      let categories = row.weight_categories
      if (typeof categories === 'string') {
        try {
          categories = JSON.parse(categories)
        } catch (error) {
          categories = []
        }
      }
      if (!Array.isArray(categories)) return

      categories.forEach((item, index) => {
        inserts.push({
          ranch_id: ranchId,
          category_key: item?.key ? String(item.key) : null,
          min_weight: toNullableNumber(item?.min),
          max_weight: toNullableNumber(item?.max),
          label: String(item?.label || `Category ${index + 1}`),
          description: item?.description === null || item?.description === undefined ? null : String(item.description),
          order_index: index,
        })
      })
    })

    if (inserts.length > 0) {
      await queryInterface.bulkInsert(RANCH_WEIGHT_CATEGORIES_TABLE, inserts)
    }

    await queryInterface.removeColumn(RANCHES_TABLE, 'weight_categories')
  },

  down: async () => {
    // no-op to avoid destructive rollback
  }
};
