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

  sellPrice: {
    allowNull: true,
    type: DataTypes.DECIMAL(10,2),
    field: 'sell_price',
  },

  weight: {
    allowNull: true,
    type: DataTypes.DECIMAL(10,2),
  },

  seller: {
    allowNull: false,
    type: DataTypes.STRING,
  },

  dairy: {
    allowNull: true,
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
  },

  shippedOutDate: {
    allowNull: true,
    type: DataTypes.DATE,
    field: 'shipped_out_date',
  },

  shippedTo: {
    allowNull: true,
    type: DataTypes.STRING,
    field: 'shipped_to',
  },

  proteinLevel: {
    allowNull: true,
    type: DataTypes.DECIMAL(8,2),
    field: 'protein_level',
  },

  proteinTest: {
    allowNull: true,
    type: DataTypes.STRING,
    field: 'protein_test',
  },

  backTag: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('originalID')
    },
    set(value) {
      this.setDataValue('originalID', value)
    }
  },

  dateIn: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('placedDate')
    },
    set(value) {
      this.setDataValue('placedDate', value)
    }
  },

  purchasePrice: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('price')
    },
    set(value) {
      this.setDataValue('price', value)
    }
  },

  daysOnFeed: {
    type: DataTypes.VIRTUAL,
    get() {
      const startValue = this.getDataValue('placedDate')
      const rawPre = Number(this.getDataValue('preDaysOnFeed') || 0)
      const pre = Number.isFinite(rawPre) ? Math.max(0, rawPre) : 0
      if (!startValue) return pre

      const start = new Date(startValue)
      if (Number.isNaN(start.getTime())) return pre

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const placedDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const diff = Math.floor((today.getTime() - placedDay.getTime()) / (1000 * 60 * 60 * 24))
      const elapsed = Math.max(0, diff) + 1
      return elapsed + pre
    }
  }
}

class Calves extends Model {

    static associate(models) {

        this.hasMany(models.CalfLoads, {
          foreignKey: 'calfID',
          as: 'calfLoads'
        })

        this.hasMany(models.CalfMovementHistory, {
            foreignKey: 'calfID',
            as: 'movementHistory'
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
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    }
  }

module.exports = { Calves, CalvesSchema, CALVES_TABLE };
