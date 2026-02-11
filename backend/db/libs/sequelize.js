const { Sequelize } = require('sequelize')

const { databaseUrl } = require('./../../config/config').config
const setupModels = require('../models')

const options = {
  dialect: 'postgres',
  logging: false,
}

const sequelize = new Sequelize(databaseUrl, options)

setupModels(sequelize);

module.exports = {
  sequelize,
  model: sequelize.models
}
