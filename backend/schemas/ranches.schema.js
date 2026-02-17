const Joi = require('joi')

const id = Joi.number().integer()
const name = Joi.string()
const address = Joi.string()
const city = Joi.string()
const zipCode = Joi.string()
const state = Joi.string()
const manager = Joi.string()
const color = Joi.string()
const createdBy = Joi.string()
const weightCategoryEntry = Joi.object({
  key: Joi.string().allow(null, ""),
  min: Joi.number().allow(null),
  max: Joi.number().allow(null),
  label: Joi.string().allow(null, ""),
  description: Joi.string().allow(null, ""),
  breeds: Joi.array().items(Joi.string().trim().allow("")).allow(null),
})
const weightCategories = Joi.array().items(weightCategoryEntry).allow(null)
const pricePeriodEntry = Joi.object({
  key: Joi.string().allow(null, ""),
  label: Joi.string().allow(null, ""),
  startDate: Joi.date().allow(null, ""),
  endDate: Joi.date().allow(null, ""),
  purchasePrice: Joi.number().allow(null),
  sellPrice: Joi.number().allow(null),
  layoutMode: Joi.string().valid('weight', 'single').allow(null, ""),
  sheetData: Joi.object().unknown(true).allow(null),
})
const pricePeriods = Joi.array().items(pricePeriodEntry).allow(null)

const createRanchesSchema = Joi.object({

    name: name.required(),
    address: address.allow(null),
    city: city.allow(null),
    zipCode: zipCode.allow(null, ""),
    state: state.allow(null),
    manager: manager.allow(null, ""),
    color: color,
    createdBy: createdBy.allow(null, ""),
    weightCategories: weightCategories,
    pricePeriods: pricePeriods

})

const getRanchesSchema = Joi.object({

    id: id.required()

})

const updateRanchesSchema = Joi.object({
    
    name: name,
    address: address,
    city: city,
    zipCode: zipCode.allow(null, ""),
    state: state,
    manager: manager.allow(null, ""),
    color: color,
    weightCategories: weightCategories,
    pricePeriods: pricePeriods

})

module.exports = { createRanchesSchema, getRanchesSchema, updateRanchesSchema }
