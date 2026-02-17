'use strict';

const RANCHES_TABLE = 'ranches'
const RANCH_PRICE_PERIODS_TABLE = 'ranch_price_periods'

const tableExists = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables()
  return tables.some((entry) => {
    if (typeof entry === 'string') return entry === tableName
    return entry?.tableName === tableName || entry?.table_name === tableName
  })
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hasRanches = await tableExists(queryInterface, RANCHES_TABLE)
    if (!hasRanches) return

    const hasTable = await tableExists(queryInterface, RANCH_PRICE_PERIODS_TABLE)
    if (!hasTable) {
      await queryInterface.createTable(RANCH_PRICE_PERIODS_TABLE, {
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
        period_key: {
          allowNull: true,
          type: Sequelize.STRING,
        },
        label: {
          allowNull: false,
          type: Sequelize.STRING,
        },
        start_date: {
          allowNull: true,
          type: Sequelize.DATEONLY,
        },
        end_date: {
          allowNull: true,
          type: Sequelize.DATEONLY,
        },
        purchase_price: {
          allowNull: true,
          type: Sequelize.DECIMAL(10, 2),
        },
        sell_price: {
          allowNull: true,
          type: Sequelize.DECIMAL(10, 2),
        },
        layout_mode: {
          allowNull: false,
          type: Sequelize.STRING,
          defaultValue: 'single',
        },
        sheet_data: {
          allowNull: false,
          type: Sequelize.JSONB,
          defaultValue: {},
        },
        order_index: {
          allowNull: false,
          type: Sequelize.INTEGER,
          defaultValue: 0,
        },
      })
      await queryInterface.addIndex(RANCH_PRICE_PERIODS_TABLE, ['ranch_id'], { name: 'ranch_price_periods_ranch_id_idx' })
    }
  },

  down: async () => {
    // no-op to avoid destructive rollback
  }
}
