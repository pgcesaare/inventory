const Joi = require('joi')

const id = Joi.number().integer()
const originRanchID = Joi.number().integer()
const destinationRanchID = Joi.number().integer()
const destinationName = Joi.string().max(255).trim().allow(null, '')
const departureDate = Joi.date()
const arrivalDate = Joi.date()
const notes = Joi.string().max(255)
const eids = Joi.array()
const primaryIDs = Joi.array().items(Joi.string())
const trucking = Joi.string().allow(null, '')

const createLoadsSchema = Joi.object({

    originRanchID: originRanchID.required(),
    destinationRanchID: destinationRanchID.allow(null),
    destinationName: destinationName,
    departureDate: departureDate.required(),
    arrivalDate: arrivalDate.allow(null),
    notes: notes.allow(null),
    trucking: trucking,
    eids: eids.allow(null),
    primaryIDs: primaryIDs.allow(null)

}).or('destinationRanchID', 'destinationName')

const getLoadsSchema = Joi.object({

    id: id.required()

})

const updateLoadsSchema = Joi.object({
    
    originRanchID: originRanchID,
    destinationRanchID: destinationRanchID,
    destinationName: destinationName,
    departureDate: departureDate,
    arrivalDate: arrivalDate,
    notes: notes,
    trucking: trucking,
    eids: eids,
    primaryIDs: primaryIDs


})

module.exports = { createLoadsSchema, getLoadsSchema, updateLoadsSchema }
