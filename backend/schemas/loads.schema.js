const Joi = require('joi')

const id = Joi.number().integer()
const originRanchID = Joi.number().integer()
const destinationRanchID = Joi.number().integer().allow(null)
const destinationName = Joi.string().max(255).trim().allow(null, '')
const departureDate = Joi.date()
const arrivalDate = Joi.date()
const notes = Joi.string().max(255)
const eids = Joi.array()
const primaryIDs = Joi.array().items(Joi.string())
const calfIDs = Joi.array().items(Joi.number().integer())
const trucking = Joi.string().allow(null, '')
const createdBy = Joi.string().allow(null, '')
const arrivalStatus = Joi.string().valid('doa', 'issue', 'not_in_load').insensitive().trim()
const afterArrivalNotes = Joi.string().max(255).allow(null, '')

const createLoadsSchema = Joi.object({

    originRanchID: originRanchID.required(),
    destinationRanchID: destinationRanchID.allow(null),
    destinationName: destinationName,
    departureDate: departureDate.required(),
    arrivalDate: arrivalDate.allow(null),
    notes: notes.allow(null),
    trucking: trucking,
    createdBy: createdBy,
    eids: eids.allow(null),
    primaryIDs: primaryIDs.allow(null),
    calfIDs: calfIDs.allow(null)

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
    afterArrivalNotes: afterArrivalNotes,
    trucking: trucking,
    eids: eids,
    primaryIDs: primaryIDs,
    calfIDs: calfIDs


})

const updateLoadCalfArrivalStatusSchema = Joi.object({
    calfID: id.required(),
    actingRanchID: id.required(),
    arrivalStatus: arrivalStatus.allow(null, '').required()
})

module.exports = { createLoadsSchema, getLoadsSchema, updateLoadsSchema, updateLoadCalfArrivalStatusSchema }
