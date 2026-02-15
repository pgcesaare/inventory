const Joi = require('joi')

const id = Joi.number().integer()
const name = Joi.string().trim().max(120)

const getBreedSchema = Joi.object({
  id: id.required(),
})

const createBreedSchema = Joi.object({
  name: name.required(),
})

const updateBreedSchema = Joi.object({
  name: name,
})

module.exports = {
  getBreedSchema,
  createBreedSchema,
  updateBreedSchema,
}
