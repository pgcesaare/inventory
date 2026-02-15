const Joi = require('joi')

const id = Joi.number().integer()
const name = Joi.string().trim().max(140)
const address = Joi.string().trim().max(200)
const city = Joi.string().trim().max(120)
const state = Joi.string().trim().max(40)
const zipCode = Joi.string().trim().max(20)

const getSellerSchema = Joi.object({
  id: id.required(),
})

const createSellerSchema = Joi.object({
  name: name.required(),
  address: address.allow(null, ''),
  city: city.allow(null, ''),
  state: state.allow(null, ''),
  zipCode: zipCode.allow(null, ''),
})

const updateSellerSchema = Joi.object({
  name: name,
  address: address.allow(null, ''),
  city: city.allow(null, ''),
  state: state.allow(null, ''),
  zipCode: zipCode.allow(null, ''),
})

module.exports = {
  getSellerSchema,
  createSellerSchema,
  updateSellerSchema,
}
