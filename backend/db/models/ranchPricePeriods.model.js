const { Model, DataTypes } = require('sequelize')

const { RANCHES_TABLE } = require('./ranches')

const RANCH_PRICE_PERIODS_TABLE = 'ranch_price_periods'

const RanchPricePeriodsSchema = {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER,
  },
  ranchID: {
    allowNull: false,
    type: DataTypes.INTEGER,
    field: 'ranch_id',
    references: {
      model: RANCHES_TABLE,
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  periodKey: {
    allowNull: true,
    type: DataTypes.STRING,
    field: 'period_key',
  },
  label: {
    allowNull: false,
    type: DataTypes.STRING,
  },
  startDate: {
    allowNull: true,
    type: DataTypes.DATEONLY,
    field: 'start_date',
  },
  endDate: {
    allowNull: true,
    type: DataTypes.DATEONLY,
    field: 'end_date',
  },
  purchasePrice: {
    allowNull: true,
    type: DataTypes.DECIMAL(10, 2),
    field: 'purchase_price',
  },
  sellPrice: {
    allowNull: true,
    type: DataTypes.DECIMAL(10, 2),
    field: 'sell_price',
  },
  layoutMode: {
    allowNull: false,
    type: DataTypes.STRING,
    defaultValue: 'single',
    field: 'layout_mode',
  },
  sheetData: {
    allowNull: false,
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'sheet_data',
  },
  orderIndex: {
    allowNull: false,
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'order_index',
  },
}

class RanchPricePeriods extends Model {
  static associate(models) {
    this.belongsTo(models.Ranches, {
      foreignKey: 'ranchID',
      as: 'ranch',
    })
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: RANCH_PRICE_PERIODS_TABLE,
      modelName: 'RanchPricePeriods',
      timestamps: false,
    }
  }
}

module.exports = {
  RanchPricePeriods,
  RanchPricePeriodsSchema,
  RANCH_PRICE_PERIODS_TABLE,
}
