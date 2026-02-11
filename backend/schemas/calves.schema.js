const Joi = require('joi')

const id = Joi.number().integer()
const primaryID = Joi.string()
const EID = Joi.string()
const originalID = Joi.string()
const placedDate = Joi.date()
const breed = Joi.string()
const sex = Joi.string().valid('bull', 'heifer', 'steer', 'freeMartin').insensitive().trim()
const price = Joi.number().precision(2)
const currentRanchID = Joi.number().integer()
const originRanchID = Joi.number().integer()
const seller = Joi.string()
const loadID = Joi.number().integer()
const status = Joi.string().valid('feeding','sold', 'alive', 'deceased', 'shipped').insensitive().trim()
const condition = Joi.string()
const calfType = Joi.string().valid('1', '2')
const preDaysOnFeed = Joi.number().integer()

const createCalvesSchema = Joi.object({

    primaryID: primaryID.required(),
    EID: EID.allow(null, '').optional(),
    originalID: originalID,
    placedDate: placedDate,
    breed: breed.required(),
    sex: sex.required(),
    price: price,
    seller: seller.required(),
    currentRanchID: currentRanchID.required(),
    originRanchID: originRanchID,
    loadID: loadID,
    status: status.required(),
    condition: condition,
    calfType: calfType.required(),
    preDaysOnFeed: preDaysOnFeed

})

const getCalvesSchema = Joi.object({

    id: id,
    primaryID: primaryID,
    EID: EID,
    originalID: originalID

})

const updateCalvesSchema = Joi.object({
    
    primaryID: primaryID,
    EID: EID,
    originalID: originalID,
    placedDate: placedDate  ,
    breed: breed,
    sex: sex,
    price: price,
    seller: seller,
    currentRanchID: currentRanchID,
    originRanchID: originRanchID,
    loadID: loadID,
    status: status,
    condition: condition,
    calfType: calfType,
    preDaysOnFeed: preDaysOnFeed

})

module.exports = { createCalvesSchema, getCalvesSchema, updateCalvesSchema }