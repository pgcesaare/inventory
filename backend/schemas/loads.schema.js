const Joi = require('joi')

const id = Joi.number().integer()
const originRanchID = Joi.number().integer()
const destinationRanchID = Joi.number().integer()
const departureDate = Joi.date()
const arrivalDate = Joi.date()
const notes = Joi.string().max(255)
const eids = Joi.array()

const createLoadsSchema = Joi.object({

    originRanchID: originRanchID.required(),
    destinationRanchID: destinationRanchID.required(),
    departureDate: departureDate.required(),
    arrivalDate: arrivalDate.allow(null),
    notes: notes.allow(null),
    eids: eids.allow(null)

})

const getLoadsSchema = Joi.object({

    id: id.required()

})

const updateLoadsSchema = Joi.object({
    
    originRanchID: originRanchID,
    destinationRanchID: destinationRanchID,
    departureDate: departureDate,
    arrivalDate: arrivalDate,
    notes: notes,
    eids: eids


})

module.exports = { createLoadsSchema, getLoadsSchema, updateLoadsSchema }