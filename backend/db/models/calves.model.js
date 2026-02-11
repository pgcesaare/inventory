const { Model, DataTypes, Sequelize, ENUM } = require('sequelize')

const { RANCHES_TABLE } = require('./ranches')

const CALVES_TABLE = 'calves' 

const CalvesSchema = {

  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },

  primaryID: {
    allowNull: false,
    type: DataTypes.STRING,
    unique: false,
    field: 'primary_id'
  },

  EID: {
    allowNull: true,
    type: DataTypes.STRING,
    unique: false,
  },

  originalID: {
    allowNull: true,
    type: DataTypes.STRING,
    unique: false,
    field: 'original_id'
  },

  placedDate: {
    allowNull: true,
    type: DataTypes.DATE,
    field: 'placed_date',
  },

  breed: {
    allowNull: false,
    type: DataTypes.STRING, 
  },

  sex: {
    allowNull: false,
    type: DataTypes.ENUM('bull', 'heifer', 'steer', 'freeMartin'),
  },

  price: {
    allowNull: true,
    type: DataTypes.DECIMAL(10,2),
  },

  seller: {
    allowNull: false,
    type: DataTypes.STRING,
  },

  currentRanchID: {
    allowNull: false,
    type: DataTypes.INTEGER,
    field: 'current_ranch_id',
    references: {
      model: RANCHES_TABLE,
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },

  originRanchID: {
    allowNull: true,
    type: DataTypes.INTEGER,
    field: 'origin_ranch_id',
    references: {
            model: RANCHES_TABLE,
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },

  status: {
    allowNull: false,
    type: DataTypes.ENUM('feeding','shipped','alive', 'deceased','sold'),
    defaultValue: 'feeding'
  },

  condition: {
    allowNull: true,
    type: DataTypes.STRING,
  },

  calfType: {
    allowNull: true,
    type: DataTypes.ENUM('1','2'),
    defaultValue: '1'
  },

  preDaysOnFeed: {
    allowNull: true,
    type: DataTypes.INTEGER,
    field: 'pre_days_on_feed',
  },

  deathDate: {
    allowNull: true,
    type: DataTypes.DATE,
    field: 'death_date',
  }
}

class Calves extends Model {

    static associate(models) {

        this.hasMany(models.CalfLoads, {
          foreignKey: 'calfID',
          as: 'calfLoads'
        })

        this.belongsTo(models.Ranches, {
            foreignKey: 'currentRanchID',
            as: 'currentRanch'
        })

        this.belongsTo(models.Ranches, {
            foreignKey: 'originRanchID',
            as: 'originRanch'
        })

    }
  
    static config(sequelize) {
      return {
        sequelize,
        tableName: CALVES_TABLE,
        modelName: 'Calves',
        timestamps: false
      }
    }
  }

module.exports = { Calves, CalvesSchema, CALVES_TABLE };