const Joi = require('joi')

const id = Joi.number().integer()
const name = Joi.string()
const address = Joi.string()
const city = Joi.string()
const state = Joi.string()
const color = Joi.string()

const createRanchesSchema = Joi.object({

    name: name.required(),
    address: address.allow(null),
    city: city.allow(null),
    state: state.allow(null),
    color: color

})

const getRanchesSchema = Joi.object({

    id: id.required()

})

const updateRanchesSchema = Joi.object({
    
    name: name,
    address: address,
    city: city,
    state: state,
    color: color

})

module.exports = { createRanchesSchema, getRanchesSchema, updateRanchesSchema }