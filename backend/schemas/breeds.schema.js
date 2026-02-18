const Joi = require('joi')

const id = Joi.number().integer()
const name = Joi.string().trim().max(120)
const orderIndex = Joi.number().integer().min(0)

const getBreedSchema = Joi.object({
  id: id.required(),
})

const createBreedSchema = Joi.object({
  name: name.required(),
  orderIndex: orderIndex,
})

const updateBreedSchema = Joi.object({
  name: name,
  orderIndex: orderIndex,
})

module.exports = {
  getBreedSchema,
  createBreedSchema,
  updateBreedSchema,
}
