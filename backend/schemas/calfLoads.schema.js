const Joi = require('joi')

const id = Joi.number().integer()
const loadID = Joi.number().integer()
const calfID = Joi.number().integer()

const createCalfLoadsSchema = Joi.object({

    id: id.required(),
    loadID: loadID.required(),
    calfID: calfID.required()

})

const getCalfLoadsSchema = Joi.object({

    id: id.required()

})

const updateCalfLoadsSchema = Joi.object({

    id: id,
    loadID: loadID,
    calfID: calfID

})

module.exports = { createCalfLoadsSchema, getCalfLoadsSchema, updateCalfLoadsSchema }