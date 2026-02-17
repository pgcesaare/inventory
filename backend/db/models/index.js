const { Calves, CalvesSchema } = require('./calves.model')
const { Ranches, RanchesSchema } = require('./ranches')
const { Loads, LoadsSchema } = require('./loads')
const { CalfLoads, calfLoadsSchema } = require('./calfLoads.model')
const { CalfMovementHistory, CalfMovementHistorySchema } = require('./calfMovementHistory.model')
const { RanchWeightCategories, RanchWeightCategoriesSchema } = require('./ranchWeightCategories.model')
const { RanchPricePeriods, RanchPricePeriodsSchema } = require('./ranchPricePeriods.model')
const { Breeds, BreedsSchema } = require('./breeds.model')
const { Sellers, SellersSchema } = require('./sellers.model')

function setupModels(sequelize) {

    Calves.init(CalvesSchema, Calves.config(sequelize))
    Ranches.init(RanchesSchema, Ranches.config(sequelize))
    Loads.init(LoadsSchema, Loads.config(sequelize))
    CalfLoads.init(calfLoadsSchema, CalfLoads.config(sequelize))
    CalfMovementHistory.init(CalfMovementHistorySchema, CalfMovementHistory.config(sequelize))
    RanchWeightCategories.init(RanchWeightCategoriesSchema, RanchWeightCategories.config(sequelize))
    RanchPricePeriods.init(RanchPricePeriodsSchema, RanchPricePeriods.config(sequelize))
    Breeds.init(BreedsSchema, Breeds.config(sequelize))
    Sellers.init(SellersSchema, Sellers.config(sequelize))

    Calves.associate(sequelize.models)
    Ranches.associate(sequelize.models)
    Loads.associate(sequelize.models)
    CalfLoads.associate(sequelize.models)
    CalfMovementHistory.associate(sequelize.models)
    RanchWeightCategories.associate(sequelize.models)
    RanchPricePeriods.associate(sequelize.models)
    Breeds.associate(sequelize.models)
    Sellers.associate(sequelize.models)

}

module.exports = setupModels
