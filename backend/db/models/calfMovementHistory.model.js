const { Model, DataTypes } = require('sequelize')

const { CALVES_TABLE } = require('./calves.model')
const { RANCHES_TABLE } = require('./ranches')
const { LOADS_TABLE } = require('./loads')

const CALF_MOVEMENT_HISTORY_TABLE = 'calfMovementHistory'

const CalfMovementHistorySchema = {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },
  calfID: {
    allowNull: false,
    type: DataTypes.INTEGER,
    field: 'calf_id',
    references: {
      model: CALVES_TABLE,
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  loadID: {
    allowNull: true,
    type: DataTypes.INTEGER,
    field: 'load_id',
    references: {
      model: LOADS_TABLE,
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  movementType: {
    allowNull: false,
    type: DataTypes.ENUM('intake', 'load_transfer', 'ranch_transfer', 'status_change', 'death', 'shipped_out')
  },
  eventDate: {
    allowNull: false,
    type: DataTypes.DATE,
    field: 'event_date',
    defaultValue: DataTypes.NOW
  },
  fromRanchID: {
    allowNull: true,
    type: DataTypes.INTEGER,
    field: 'from_ranch_id',
    references: {
      model: RANCHES_TABLE,
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  toRanchID: {
    allowNull: true,
    type: DataTypes.INTEGER,
    field: 'to_ranch_id',
    references: {
      model: RANCHES_TABLE,
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  fromStatus: {
    allowNull: true,
    type: DataTypes.STRING,
    field: 'from_status'
  },
  toStatus: {
    allowNull: true,
    type: DataTypes.STRING,
    field: 'to_status'
  },
  notes: {
    allowNull: true,
    type: DataTypes.STRING
  }
}

class CalfMovementHistory extends Model {
  static associate(models) {
    this.belongsTo(models.Calves, {
      foreignKey: 'calfID',
      as: 'calf'
    })

    this.belongsTo(models.Loads, {
      foreignKey: 'loadID',
      as: 'load'
    })

    this.belongsTo(models.Ranches, {
      foreignKey: 'fromRanchID',
      as: 'fromRanch'
    })

    this.belongsTo(models.Ranches, {
      foreignKey: 'toRanchID',
      as: 'toRanch'
    })
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: CALF_MOVEMENT_HISTORY_TABLE,
      modelName: 'CalfMovementHistory',
      timestamps: false
    }
  }
}

module.exports = { CalfMovementHistory, CalfMovementHistorySchema, CALF_MOVEMENT_HISTORY_TABLE }
