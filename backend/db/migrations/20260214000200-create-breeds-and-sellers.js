'use strict';

const BREEDS_TABLE = 'breeds'
const SELLERS_TABLE = 'sellers'

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
    if (!(await tableExists(queryInterface, BREEDS_TABLE))) {
      await queryInterface.createTable(BREEDS_TABLE, {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        name: {
          allowNull: false,
          type: Sequelize.STRING,
          unique: true,
        },
        order_index: {
          allowNull: false,
          type: Sequelize.INTEGER,
          defaultValue: 0,
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
      })
    }

    if (!(await tableExists(queryInterface, SELLERS_TABLE))) {
      await queryInterface.createTable(SELLERS_TABLE, {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        name: {
          allowNull: false,
          type: Sequelize.STRING,
        },
        address: {
          allowNull: true,
          type: Sequelize.STRING,
        },
        city: {
          allowNull: true,
          type: Sequelize.STRING,
        },
        state: {
          allowNull: true,
          type: Sequelize.STRING,
        },
        zip_code: {
          allowNull: true,
          type: Sequelize.STRING,
        },
      })
    }
  },

  down: async () => {
    // No-op to avoid destructive rollback.
  },
}
