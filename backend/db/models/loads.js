const { Model, DataTypes, Sequelize, ENUM } = require('sequelize')

const { RANCHES_TABLE } = require('./ranches')

const LOADS_TABLE = 'loads' 

const LoadsSchema = {

  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },

  originRanchID: {
    allowNull: false,
    type: DataTypes.INTEGER,
    field: 'origin_ranch_id',
    references: {
        model: RANCHES_TABLE,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'   
  },

  destinationRanchID: {
    allowNull: true,
    type: DataTypes.INTEGER,
    field: 'destination_ranch_id',
    references: {
        model: RANCHES_TABLE,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'    
    },

    destinationName: {
      allowNull: true,
      type: DataTypes.STRING,
      field: 'destination_name'
    },

    departureDate: {
      allowNull: false,
      type: DataTypes.DATE,
      field: 'departure_date'
    },

    arrivalDate: {
      allowNull: true,
      type: DataTypes.DATE,
      field: 'arrival_date'
    },

  notes: {
    allowNull: true,
    type: DataTypes.STRING,
   },

  trucking: {
    allowNull: true,
    type: DataTypes.STRING,
  },



}
class Loads extends Model {

    static associate(models) {

    this.belongsTo(models.Ranches, {
      foreignKey: 'originRanchID',
      as: 'origin'
    })

    this.belongsTo(models.Ranches, {
      foreignKey: 'destinationRanchID',
      as: 'destination'
    })

    this.hasMany(models.CalfLoads, {
      foreignKey: 'loadID',
      as: 'load'
    })

    this.hasMany(models.CalfMovementHistory, {
      foreignKey: 'loadID',
      as: 'movementHistory'
    })
    
    }

    static config(sequelize) {
      return {
        sequelize,
        tableName: LOADS_TABLE,
        modelName: 'Loads',
        timestamps: false
      }
    }
  }

module.exports = { Loads, LoadsSchema, LOADS_TABLE };
