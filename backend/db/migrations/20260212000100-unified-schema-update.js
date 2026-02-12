'use strict';

const CALVES_TABLE = 'calves'
const LOADS_TABLE = 'loads'
const RANCHES_TABLE = 'ranches'
const CALF_MOVEMENT_HISTORY_TABLE = 'calfMovementHistory'

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

const ensureColumn = async (queryInterface, Sequelize, tableName, columnName, specFactory) => {
  const definition = await getTableDefinition(queryInterface, tableName)
  if (!definition || definition[columnName]) return
  await queryInterface.addColumn(tableName, columnName, specFactory(Sequelize))
}

const removeColumnIfExists = async (queryInterface, tableName, columnName) => {
  const definition = await getTableDefinition(queryInterface, tableName)
  if (!definition || !definition[columnName]) return
  await queryInterface.removeColumn(tableName, columnName)
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (await tableExists(queryInterface, RANCHES_TABLE)) {
      await ensureColumn(queryInterface, Sequelize, RANCHES_TABLE, 'manager', () => ({
        allowNull: true,
        type: Sequelize.STRING,
      }))
    }

    if (await tableExists(queryInterface, LOADS_TABLE)) {
      const loadsDefinition = await getTableDefinition(queryInterface, LOADS_TABLE)

      if (loadsDefinition?.destination_ranch_id) {
        await queryInterface.changeColumn(LOADS_TABLE, 'destination_ranch_id', {
          allowNull: true,
          type: Sequelize.INTEGER,
          references: {
            model: RANCHES_TABLE,
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        })
      }

      await ensureColumn(queryInterface, Sequelize, LOADS_TABLE, 'destination_name', () => ({
        allowNull: true,
        type: Sequelize.STRING,
      }))

      await ensureColumn(queryInterface, Sequelize, LOADS_TABLE, 'trucking', () => ({
        allowNull: true,
        type: Sequelize.STRING,
      }))
    }

    if (await tableExists(queryInterface, CALVES_TABLE)) {
      await ensureColumn(queryInterface, Sequelize, CALVES_TABLE, 'weight', () => ({
        allowNull: true,
        type: Sequelize.DECIMAL(10, 2),
      }))

      await ensureColumn(queryInterface, Sequelize, CALVES_TABLE, 'dairy', () => ({
        allowNull: true,
        type: Sequelize.STRING,
      }))

      await ensureColumn(queryInterface, Sequelize, CALVES_TABLE, 'protein_level', () => ({
        allowNull: true,
        type: Sequelize.DECIMAL(8, 2),
      }))

      await ensureColumn(queryInterface, Sequelize, CALVES_TABLE, 'protein_test', () => ({
        allowNull: true,
        type: Sequelize.STRING,
      }))

      await ensureColumn(queryInterface, Sequelize, CALVES_TABLE, 'shipped_out_date', () => ({
        allowNull: true,
        type: Sequelize.DATE,
      }))

      await ensureColumn(queryInterface, Sequelize, CALVES_TABLE, 'shipped_to', () => ({
        allowNull: true,
        type: Sequelize.STRING,
      }))

      await ensureColumn(queryInterface, Sequelize, CALVES_TABLE, 'sell_price', () => ({
        allowNull: true,
        type: Sequelize.DECIMAL(10, 2),
      }))

      await ensureColumn(queryInterface, Sequelize, CALVES_TABLE, 'pre_days_on_feed', () => ({
        allowNull: true,
        type: Sequelize.INTEGER,
      }))

      await ensureColumn(queryInterface, Sequelize, CALVES_TABLE, 'death_date', () => ({
        allowNull: true,
        type: Sequelize.DATE,
      }))

      await removeColumnIfExists(queryInterface, CALVES_TABLE, 'location')
      await removeColumnIfExists(queryInterface, CALVES_TABLE, 'feeding')
    }

    if (!(await tableExists(queryInterface, CALF_MOVEMENT_HISTORY_TABLE))) {
      await queryInterface.createTable(CALF_MOVEMENT_HISTORY_TABLE, {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        calf_id: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: CALVES_TABLE,
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        load_id: {
          allowNull: true,
          type: Sequelize.INTEGER,
          references: {
            model: LOADS_TABLE,
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        movementType: {
          allowNull: false,
          type: Sequelize.ENUM('intake', 'load_transfer', 'ranch_transfer', 'status_change', 'death', 'shipped_out'),
        },
        event_date: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
        from_ranch_id: {
          allowNull: true,
          type: Sequelize.INTEGER,
          references: {
            model: RANCHES_TABLE,
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        to_ranch_id: {
          allowNull: true,
          type: Sequelize.INTEGER,
          references: {
            model: RANCHES_TABLE,
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        from_status: {
          allowNull: true,
          type: Sequelize.STRING,
        },
        to_status: {
          allowNull: true,
          type: Sequelize.STRING,
        },
        notes: {
          allowNull: true,
          type: Sequelize.STRING,
        },
      })
    }
  },

  down: async () => {
    // Intentionally left as no-op to avoid destructive rollback of production data.
  }
};
