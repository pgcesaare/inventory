const Joi = require('joi')

const id = Joi.number().integer()
const name = Joi.string()
const address = Joi.string()
const city = Joi.string()
const zipCode = Joi.string()
const state = Joi.string()
const manager = Joi.string()
const color = Joi.string()
const weightCategoryEntry = Joi.object({
  key: Joi.string().allow(null, ""),
  min: Joi.number().allow(null),
  max: Joi.number().allow(null),
  label: Joi.string().allow(null, ""),
  description: Joi.string().allow(null, ""),
})
const weightCategories = Joi.array().items(weightCategoryEntry).allow(null)

const createRanchesSchema = Joi.object({

    name: name.required(),
    address: address.allow(null),
    city: city.allow(null),
    zipCode: zipCode.allow(null, ""),
    state: state.allow(null),
    manager: manager.allow(null, ""),
    color: color,
    weightCategories: weightCategories

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
    weightCategories: weightCategories

})

module.exports = { createRanchesSchema, getRanchesSchema, updateRanchesSchema }
