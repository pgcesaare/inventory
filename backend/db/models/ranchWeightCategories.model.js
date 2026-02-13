const { Model, DataTypes } = require('sequelize')

const { RANCHES_TABLE } = require('./ranches')

const RANCH_WEIGHT_CATEGORIES_TABLE = 'ranch_weight_categories'

const RanchWeightCategoriesSchema = {
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
  categoryKey: {
    allowNull: true,
    type: DataTypes.STRING,
    field: 'category_key',
  },
  minWeight: {
    allowNull: true,
    type: DataTypes.DECIMAL(10, 2),
    field: 'min_weight',
  },
  maxWeight: {
    allowNull: true,
    type: DataTypes.DECIMAL(10, 2),
    field: 'max_weight',
  },
  label: {
    allowNull: false,
    type: DataTypes.STRING,
  },
  description: {
    allowNull: true,
    type: DataTypes.STRING,
  },
  orderIndex: {
    allowNull: false,
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'order_index',
  },
}

class RanchWeightCategories extends Model {
  static associate(models) {
    this.belongsTo(models.Ranches, {
      foreignKey: 'ranchID',
      as: 'ranch',
    })
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: RANCH_WEIGHT_CATEGORIES_TABLE,
      modelName: 'RanchWeightCategories',
      timestamps: false,
    }
  }
}

module.exports = {
  RanchWeightCategories,
  RanchWeightCategoriesSchema,
  RANCH_WEIGHT_CATEGORIES_TABLE,
}
