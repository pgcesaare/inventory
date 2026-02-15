const { Model, DataTypes } = require('sequelize')

const SELLERS_TABLE = 'sellers'

const SellersSchema = {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER,
  },
  name: {
    allowNull: false,
    type: DataTypes.STRING,
  },
  address: {
    allowNull: true,
    type: DataTypes.STRING,
  },
  city: {
    allowNull: true,
    type: DataTypes.STRING,
  },
  state: {
    allowNull: true,
    type: DataTypes.STRING,
  },
  zipCode: {
    allowNull: true,
    type: DataTypes.STRING,
    field: 'zip_code',
  },
}

class Sellers extends Model {
  static associate() {}

  static config(sequelize) {
    return {
      sequelize,
      tableName: SELLERS_TABLE,
      modelName: 'Sellers',
      timestamps: false,
    }
  }
}

module.exports = { Sellers, SellersSchema, SELLERS_TABLE }
