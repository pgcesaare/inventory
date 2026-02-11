const { databaseUrl } = require('./../config/config').config

module.exports = {
  development: {
    url: databaseUrl,
    dialect: 'postgres',
  },
  production: {
    url: databaseUrl,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false
      }
    }
  }
}
