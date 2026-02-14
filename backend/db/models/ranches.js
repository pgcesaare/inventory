const { Model, DataTypes, Sequelize } = require('sequelize')

const RANCHES_TABLE = 'ranches' 

const RanchesSchema = {

  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },

  name: {
    allowNull: false,
    type: DataTypes.STRING,
    unique: true,
  },
  address: {
    allowNull: true,
    type: DataTypes.STRING,
    unique: false,
  },
  city: {
    allowNull: true,
    type: DataTypes.STRING,
    unique: false,
  },
  zipCode: {
    allowNull: true,
    type: DataTypes.STRING,
    unique: false,
    field: 'zip_code',
  },
  state: {
    allowNull: true,
    type: DataTypes.STRING,
    unique: false,
  },
  manager: {
    allowNull: true,
    type: DataTypes.STRING,
    unique: false,
  },
  color: {
    allowNull: true,
    type: DataTypes.STRING,
    unique: false,
  },
  createdBy: {
    allowNull: true,
    type: DataTypes.STRING,
    unique: false,
    field: 'created_by',
  },
}
class Ranches extends Model {

    static associate(models) {

    this.hasMany(models.Loads, {
            foreignKey: 'originRanchID',
            as: 'originLoads'
        })
    this.hasMany(models.Loads, {
            foreignKey: 'destinationRanchID',
            as: 'destinationLoads'
        })
    this.hasMany(models.Calves, {
            foreignKey: 'currentRanchID',
            as: 'calves'
        })
    this.hasMany(models.Calves, {
            foreignKey: 'originRanchID',
            as: 'originCalves'
        })
    this.hasMany(models.CalfMovementHistory, {
            foreignKey: 'fromRanchID',
            as: 'movementsFrom'
        })
    this.hasMany(models.CalfMovementHistory, {
            foreignKey: 'toRanchID',
            as: 'movementsTo'
        })
    this.hasMany(models.RanchWeightCategories, {
            foreignKey: 'ranchID',
            as: 'weightCategories'
        })

    }

    static config(sequelize) {
      return {
        sequelize,
        tableName: RANCHES_TABLE,
        modelName: 'Ranches',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    }
  }

module.exports = { Ranches, RanchesSchema, RANCHES_TABLE };
