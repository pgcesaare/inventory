const { Model, DataTypes, Sequelize, ENUM } = require('sequelize')

const { LOADS_TABLE } = require('./loads')
const { CALVES_TABLE } = require('./calves.model')

const CALFLOADS_TABLE = 'calfLoads'

const calfLoadsSchema = {

  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },

  loadID: {
    allowNull: false,
    type: DataTypes.INTEGER,
    field: 'loadID',
    references: {
        model: LOADS_TABLE,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'   
  },

  calfID: {
    allowNull: false,
    field: 'calfID',
    type: DataTypes.INTEGER,
    references: {
        model: CALVES_TABLE,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'    
    },

  daysOnFeedAtShipment: {
    allowNull: true,
    type: DataTypes.INTEGER,
    field: 'days_on_feed_at_shipment',
  },

  arrivalStatus: {
    allowNull: true,
    type: DataTypes.STRING,
    field: 'arrival_status',
  },
}

class CalfLoads extends Model {

    static associate(models) {

        this.belongsTo(models.Loads, {
            foreignKey: 'loadID',
            as: 'load'
        })        
        this.belongsTo(models.Calves, {
            foreignKey: 'calfID',
            as: 'calf'
        })
        
    }

    static config(sequelize) {
      return {
        sequelize,
        tableName: CALFLOADS_TABLE,
        modelName: 'CalfLoads',
        timestamps: false
      }
    }
  }

module.exports = { CalfLoads, calfLoadsSchema, CALFLOADS_TABLE };
