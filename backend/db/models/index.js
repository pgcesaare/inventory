const { Calves, CalvesSchema } = require('./calves.model')
const { Ranches, RanchesSchema } = require('./ranches')
const { Loads, LoadsSchema } = require('./loads')
const { CalfLoads, calfLoadsSchema } = require('./calfLoads.model')
const { CalfMovementHistory, CalfMovementHistorySchema } = require('./calfMovementHistory.model')

function setupModels(sequelize) {

    Calves.init(CalvesSchema, Calves.config(sequelize))
    Ranches.init(RanchesSchema, Ranches.config(sequelize))
    Loads.init(LoadsSchema, Loads.config(sequelize))
    CalfLoads.init(calfLoadsSchema, CalfLoads.config(sequelize))
    CalfMovementHistory.init(CalfMovementHistorySchema, CalfMovementHistory.config(sequelize))

    Calves.associate(sequelize.models)
    Ranches.associate(sequelize.models)
    Loads.associate(sequelize.models)
    CalfLoads.associate(sequelize.models)
    CalfMovementHistory.associate(sequelize.models)

}

module.exports = setupModels
