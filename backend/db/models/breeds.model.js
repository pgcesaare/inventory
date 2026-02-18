const { Model, DataTypes } = require('sequelize')

const BREEDS_TABLE = 'breeds'

const BreedsSchema = {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER,
  },
  name: {
    allowNull: false,
    type: DataTypes.STRING,
    unique: true,
  },
  orderIndex: {
    allowNull: false,
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'order_index',
  },
  createdAt: {
    allowNull: false,
    type: DataTypes.DATE,
    field: 'created_at',
    defaultValue: DataTypes.NOW,
  },
}

class Breeds extends Model {
  static associate() {}

  static config(sequelize) {
    return {
      sequelize,
      tableName: BREEDS_TABLE,
      modelName: 'Breeds',
      timestamps: false,
    }
  }
}

module.exports = { Breeds, BreedsSchema, BREEDS_TABLE }
